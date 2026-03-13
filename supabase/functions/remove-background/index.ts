import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Try env var first, fall back to app_config table
    let GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      const { data: cfg } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "GEMINI_API_KEY")
        .maybeSingle();
      GEMINI_API_KEY = cfg?.value || null;
    }
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const { imageId, imageUrl } = await req.json();
    if (!imageId || !imageUrl) throw new Error("imageId and imageUrl are required");

    console.log(`Processing background removal for image ${imageId}`);

    // Fetch the source image and convert to base64
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.status}`);
    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const mimeType = imgResponse.headers.get("content-type") || "image/png";

    // Call Google Gemini API directly for background removal
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Remove the background from this image completely. Make the background fully transparent. Keep only the main subject/object in the image with clean edges. Return the result as a PNG image.",
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imgBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          responseMimeType: "image/png",
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();

    // Extract the generated image from Gemini response
    let generatedImageBase64: string | null = null;
    const candidates = aiData.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }
      if (generatedImageBase64) break;
    }

    if (!generatedImageBase64) {
      throw new Error("No image returned from Gemini");
    }

    // Convert base64 to binary and upload to storage
    const binaryData = Uint8Array.from(atob(generatedImageBase64), (c) => c.charCodeAt(0));

    const storagePath = `products/nobg/${imageId}-nobg.png`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(storagePath, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);
    const nobgUrl = urlData.publicUrl;

    // Update the product_images record
    const { error: updateError } = await supabase
      .from("product_images")
      .update({ nobg_url: nobgUrl })
      .eq("id", imageId);

    if (updateError) throw updateError;

    console.log(`Background removed successfully for image ${imageId}`);

    return new Response(JSON.stringify({ nobgUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remove-background error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
