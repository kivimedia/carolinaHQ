'use client';

import { useState, useRef } from 'react';
import { CheckCircle, FileText, Pen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SignContractViewProps {
  signature: any;
}

export default function SignContractView({ signature }: SignContractViewProps) {
  const project = signature.rental_projects;
  const client = project?.rental_clients;
  const items = project?.rental_project_items || [];

  const [step, setStep] = useState<'review' | 'sign' | 'done'>(
    signature.status === 'signed' ? 'done' : 'review'
  );
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState(client?.email || '');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height));
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height));
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!signerName.trim() || !hasDrawn || !agreed) return;
    setIsSubmitting(true);

    try {
      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL('image/png') : null;

      const supabase = createClient();
      const { error } = await supabase
        .from('contract_signatures')
        .update({
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || null,
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          status: 'signed',
          user_agent: navigator.userAgent,
        })
        .eq('id', signature.id);

      if (error) throw error;
      setStep('done');
      toast.success('Contract signed successfully!');
    } catch (err: any) {
      toast.error(`Failed to sign: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  if (step === 'done' || signature.status === 'signed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Signed!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for signing the contract for <strong>{project?.name}</strong>.
          </p>
          {signature.signed_at && (
            <p className="text-sm text-gray-500">
              Signed on {new Date(signature.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {signature.signer_name && ` by ${signature.signer_name}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {['Review', 'Sign'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                (step === 'review' && i === 0) || (step === 'sign' && i === 1)
                  ? 'bg-pink-500 text-white'
                  : i === 0 && step === 'sign'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {i === 0 && step === 'sign' ? <CheckCircle className="h-5 w-5" /> : i + 1}
              </div>
              <span className="text-sm font-medium">{label}</span>
              {i === 0 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>

        {/* Review step */}
        {step === 'review' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-pink-500 text-white p-6">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">Quote / Contract</span>
              </div>
              <h1 className="text-xl font-bold">{project?.name}</h1>
            </div>

            <div className="p-6 space-y-6">
              {/* Client info */}
              {client && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Prepared for</h3>
                  <p className="font-medium">{client.name}</p>
                  {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
                </div>
              )}

              {/* Event details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Event Details</h3>
                {project?.start_date && (
                  <p className="text-sm">Date: {new Date(project.start_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                )}
                {project?.venue && <p className="text-sm">Venue: {project.venue}</p>}
              </div>

              {/* Items */}
              {items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Items</h3>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Item</th>
                          <th className="text-center px-3 py-2 font-medium w-16">Qty</th>
                          <th className="text-right px-3 py-2 font-medium w-20">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: any) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="text-center px-3 py-2">{item.quantity}</td>
                            <td className="text-right px-3 py-2">{fmt(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-pink-50 rounded-xl p-4 text-right">
                {project?.subtotal != null && (
                  <p className="text-sm">Subtotal: {fmt(project.subtotal)}</p>
                )}
                {project?.tax_amount != null && project.tax_amount > 0 && (
                  <p className="text-sm">Tax: {fmt(project.tax_amount)}</p>
                )}
                <p className="text-lg font-bold text-pink-600 mt-1">
                  Total: {fmt(project?.total || 0)}
                </p>
              </div>

              <button
                onClick={() => setStep('sign')}
                className="w-full rounded-xl bg-pink-500 text-white py-3 font-medium hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
              >
                <Pen className="h-4 w-4" /> Continue to Sign
              </button>
            </div>
          </div>
        )}

        {/* Sign step */}
        {step === 'sign' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Sign Contract</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name *</label>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Signature *</label>
                <button onClick={clearSignature} className="text-xs text-pink-500 hover:underline">
                  Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
                className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 cursor-crosshair bg-gray-50 touch-none"
              />
              {!hasDrawn && (
                <p className="text-xs text-gray-400 mt-1">Draw your signature above</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded border-gray-300"
                id="agree-terms"
              />
              <label htmlFor="agree-terms" className="text-sm text-gray-600">
                I have reviewed the quote/contract above and agree to the terms and conditions outlined.
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('review')}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Review
              </button>
              <button
                onClick={handleSign}
                disabled={!signerName.trim() || !hasDrawn || !agreed || isSubmitting}
                className="flex-1 rounded-xl bg-pink-500 text-white py-3 font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing...' : 'Sign Contract'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
