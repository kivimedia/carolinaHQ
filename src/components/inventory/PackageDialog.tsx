'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui-shadcn/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-shadcn/tabs';
import { ScrollArea } from '@/components/ui-shadcn/scroll-area';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { Loader2, X } from 'lucide-react';
import { useUpdatePackage, useCreatePackage, useInventoryPackage } from '@/hooks/inventory/useInventoryPackages';
import type { InventoryPackage } from '@/lib/inventory/types';
import { PackageEditBasicsTab } from './package-edit/PackageEditBasicsTab';
import { PackageEditDetailsTab } from './package-edit/PackageEditDetailsTab';
import { PackageEditContentsTab } from './package-edit/PackageEditContentsTab';
import { PackageEditAccessoriesTab } from './package-edit/PackageEditAccessoriesTab';
import { PackageEditAlternatesTab } from './package-edit/PackageEditAlternatesTab';
import { PackageEditServicesTab } from './package-edit/PackageEditServicesTab';
import { PackageEditParentsTab } from './package-edit/PackageEditParentsTab';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package_?: InventoryPackage | null;
}

export function PackageDialog({ open, onOpenChange, package_ }: PackageDialogProps) {
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const isEditing = !!package_;

  const { data: livePackage } = useInventoryPackage(package_?.id);
  const pkg = livePackage ?? package_;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [contractDescription, setContractDescription] = useState('');
  const [ecommerceDescription, setEcommerceDescription] = useState('');
  const [ecommerceSameAsContract, setEcommerceSameAsContract] = useState(true);
  const [price, setPrice] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [contentsLocked, setContentsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('basics');

  useEffect(() => {
    if (open) {
      if (package_) {
        setName(package_.name);
        setSku(package_.sku || '');
        setDescription(package_.description || '');
        setPrice(package_.price);
        setDiscountType(package_.discount_type);
        setDiscountValue(package_.discount_value);
        setCategoryId(package_.category_id || null);
        loadExtendedFields(package_.id);
      } else {
        setName(''); setSku(''); setDescription('');
        setContractDescription(''); setEcommerceDescription('');
        setEcommerceSameAsContract(true);
        setPrice(0); setDiscountType('fixed'); setDiscountValue(0);
        setCategoryId(null); setDeliveryRequired(false); setContentsLocked(false);
      }
      setActiveTab('basics');
    }
  }, [open, package_]);

  const loadExtendedFields = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('inventory_packages')
      .select('contract_description, ecommerce_description, ecommerce_same_as_contract, delivery_required, contents_locked')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      setContractDescription(data.contract_description || '');
      setEcommerceDescription(data.ecommerce_description || '');
      setEcommerceSameAsContract(data.ecommerce_same_as_contract ?? true);
      setDeliveryRequired(data.delivery_required ?? false);
      setContentsLocked(data.contents_locked ?? false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      const supabase = createClient();
      if (isEditing && package_) {
        await updatePackage.mutateAsync({
          id: package_.id,
          name, sku: sku || null, description: description || null,
          price, discount_type: discountType, discount_value: discountValue,
          category_id: categoryId,
        });
        await supabase.from('inventory_packages').update({
          contract_description: contractDescription || null,
          ecommerce_description: ecommerceDescription || null,
          ecommerce_same_as_contract: ecommerceSameAsContract,
          delivery_required: deliveryRequired,
          contents_locked: contentsLocked,
        }).eq('id', package_.id);
        toast.success(`"${name}" updated`);
      } else {
        const newPkg = await createPackage.mutateAsync({
          name, description: description || undefined,
          sku: sku || undefined, price,
          discount_type: discountType, discount_value: discountValue,
          category_id: categoryId,
        });
        if (newPkg?.id) {
          await supabase.from('inventory_packages').update({
            contract_description: contractDescription || null,
            ecommerce_description: ecommerceDescription || null,
            ecommerce_same_as_contract: ecommerceSameAsContract,
            delivery_required: deliveryRequired,
            contents_locked: contentsLocked,
          }).eq('id', newPkg.id);
        }
        toast.success(`"${name}" created`);
      }
      onOpenChange(false);
    } catch {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} package`);
    }
  };

  const isPending = createPackage.isPending || updatePackage.isPending;
  const items = (pkg as any)?.items || [];
  const contentsCount = items.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl border-cb-pink-100">
        {/* Header */}
        <div className="bg-cb-pink text-white px-6 py-4 flex items-center justify-between shrink-0 rounded-t-2xl">
          <h2 className="text-lg font-semibold truncate">
            {isEditing ? name || package_?.name : 'New Package'}
          </h2>
          <button onClick={() => onOpenChange(false)} className="text-white/80 hover:text-white p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-cb-pink-100 px-2 shrink-0 overflow-x-auto">
            <TabsList className="bg-transparent border-0 h-auto p-0 gap-0 w-full justify-start">
              {[
                { value: 'basics', label: 'BASICS' },
                { value: 'details', label: 'DETAILS' },
                { value: 'contents', label: `CONTENTS (${contentsCount})` },
                { value: 'accessories', label: 'ACCESSORIES' },
                { value: 'alternates', label: 'ALTERNATES' },
                { value: 'services', label: 'SERVICES' },
                { value: 'parents', label: 'PARENTS' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-muted-foreground data-[state=active]:text-cb-pink data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-cb-pink rounded-none px-4 py-3 font-semibold text-xs sm:text-sm whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <TabsContent value="basics" className="m-0">
                <PackageEditBasicsTab
                  name={name} setName={setName}
                  categoryId={categoryId} setCategoryId={setCategoryId}
                  price={price} setPrice={setPrice}
                  discountType={discountType} setDiscountType={setDiscountType}
                  discountValue={discountValue} setDiscountValue={setDiscountValue}
                />
              </TabsContent>
              <TabsContent value="details" className="m-0">
                <PackageEditDetailsTab
                  sku={sku} setSku={setSku}
                  description={description} setDescription={setDescription}
                  contractDescription={contractDescription} setContractDescription={setContractDescription}
                  ecommerceDescription={ecommerceDescription} setEcommerceDescription={setEcommerceDescription}
                  ecommerceSameAsContract={ecommerceSameAsContract} setEcommerceSameAsContract={setEcommerceSameAsContract}
                  contentsLocked={contentsLocked} setContentsLocked={setContentsLocked}
                />
              </TabsContent>
              <TabsContent value="contents" className="m-0">
                {isEditing && package_ ? (
                  <PackageEditContentsTab packageId={package_.id} packageName={name} items={items} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">Save the package first to manage contents.</p>
                )}
              </TabsContent>
              <TabsContent value="accessories" className="m-0">
                {isEditing && package_ ? (
                  <PackageEditAccessoriesTab packageId={package_.id} packageName={name} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">Save the package first to manage accessories.</p>
                )}
              </TabsContent>
              <TabsContent value="alternates" className="m-0">
                {isEditing && package_ ? (
                  <PackageEditAlternatesTab packageId={package_.id} packageName={name} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">Save the package first to manage alternates.</p>
                )}
              </TabsContent>
              <TabsContent value="services" className="m-0">
                <PackageEditServicesTab packageId={package_?.id || ''} packageName={name} deliveryRequired={deliveryRequired} setDeliveryRequired={setDeliveryRequired} />
              </TabsContent>
              <TabsContent value="parents" className="m-0">
                {isEditing && package_ ? (
                  <PackageEditParentsTab packageId={package_.id} packageName={name} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">Save the package first to manage parents.</p>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-cb-pink-100 px-6 py-3 flex items-center gap-2 shrink-0">
          <InventoryButton inventoryVariant="primary" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </InventoryButton>
          <InventoryButton inventoryVariant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </InventoryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
