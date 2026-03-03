// PDF generation types for CarolinaHQ

export type DocumentType = 'CONTRACT' | 'INVOICE' | 'QUOTE';

export interface PdfCompanyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  logoBase64?: string;
  primaryColor?: string;
}

export interface PdfClientInfo {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
}

export interface PdfProjectInfo {
  id: string;
  name: string;
  status: string;
  venue?: string;
  venueAddress?: string;
  startDate?: string;
  endDate?: string;
  setupDate?: string;
  teardownDate?: string;
  subtotal?: number;
  taxAmount?: number;
  taxRate?: number;
  discountAmount?: number;
  total: number;
  notes?: string;
}

export interface PdfLineItem {
  id: string;
  name: string;
  category?: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
  isService?: boolean;
  imageUrl?: string;
}

export interface PdfPayment {
  id: string;
  amount: number;
  paymentMethod?: string;
  paymentType: string;
  status: string;
  paidDate?: string;
  createdAt: string;
}

export interface PdfPolicyContent {
  name: string;
  content: string;
}

export interface GenerateDocumentOptions {
  documentType: DocumentType;
  project: PdfProjectInfo;
  client?: PdfClientInfo;
  items: PdfLineItem[];
  payments?: PdfPayment[];
  company?: PdfCompanyInfo;
  policies?: {
    payment?: PdfPolicyContent;
    cancellation?: PdfPolicyContent;
    terms?: PdfPolicyContent;
  };
  showItemImages?: boolean;
}

// Carolina Balloons branded colors (RGB tuples)
export const CB_COLORS = {
  pink: [236, 72, 153] as [number, number, number],       // #ec4899
  pinkLight: [252, 231, 243] as [number, number, number],  // #fce7f3
  navy: [30, 41, 59] as [number, number, number],          // #1e293b
  gold: [212, 168, 83] as [number, number, number],        // #d4a853
  muted: [100, 116, 139] as [number, number, number],      // #64748b
  success: [22, 163, 74] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightBg: [253, 242, 248] as [number, number, number],    // #fdf2f8
};
