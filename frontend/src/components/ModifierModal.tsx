import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { rupiah } from '../utils/formatters';
import type { Product } from '../types';

interface ModifierModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (customization: {
    modifiers: string[];
    extraPrice: number;
    notes: string;
  }) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({ product, onClose, onConfirm }) => {
  const [sugarLevel, setSugarLevel] = useState<string>('Normal Sugar');
  const [iceLevel, setIceLevel] = useState<string>('Normal Ice');
  const [milkChoice, setMilkChoice] = useState<{ name: string; price: number }>({
    name: 'Fresh Milk (Default)',
    price: 0,
  });
  const [notes, setNotes] = useState<string>('');

  const isDrink = product.category_name === 'Kopi' || product.category_name === 'Non-Kopi';

  const milkOptions = [
    { name: 'Fresh Milk (Default)', price: 0 },
    { name: 'Oat Milk (+Rp 6.000)', price: 6000 },
    { name: 'Soy Milk (+Rp 5.000)', price: 5000 },
  ];

  const handleConfirm = () => {
    const modifiers: string[] = [];
    let extraPrice = 0;

    if (isDrink) {
      modifiers.push(sugarLevel);
      modifiers.push(iceLevel);
      if (milkChoice.price > 0) {
        modifiers.push(milkChoice.name);
        extraPrice += milkChoice.price;
      }
    }

    onConfirm({
      modifiers,
      extraPrice,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg transition"
        >
          <X size={20} />
        </button>

        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-[#c59a68] font-bold">Kustomisasi Menu</div>
          <h3 className="text-lg font-bold text-zinc-100">{product.name}</h3>
          <div className="text-sm font-semibold text-zinc-400 font-mono mt-0.5">
            {rupiah(product.base_price + milkChoice.price)}
          </div>
        </div>

        {isDrink && (
          <div className="space-y-4 mb-4">
            {/* Sugar Level */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Tingkat Kemanisan (Sugar):</label>
              <div className="grid grid-cols-3 gap-2">
                {['Normal Sugar (100%)', 'Less Sugar (50%)', 'No Sugar (0%)'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSugarLevel(opt)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition ${
                      sugarLevel === opt
                        ? 'bg-[#c59a68] text-black border-[#c59a68] font-semibold'
                        : 'bg-[#121316] border-[#2e313b] text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    {opt.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Ice Level */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Tingkat Es (Ice):</label>
              <div className="grid grid-cols-3 gap-2">
                {['Normal Ice', 'Less Ice', 'No Ice'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIceLevel(opt)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition ${
                      iceLevel === opt
                        ? 'bg-[#c59a68] text-black border-[#c59a68] font-semibold'
                        : 'bg-[#121316] border-[#2e313b] text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Milk Option */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Pilihan Susu (Milk):</label>
              <div className="space-y-1.5">
                {milkOptions.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setMilkChoice(opt)}
                    className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium border transition ${
                      milkChoice.name === opt.name
                        ? 'bg-[#c59a68]/20 border-[#c59a68] text-amber-300'
                        : 'bg-[#121316] border-[#2e313b] text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    <span>{opt.name}</span>
                    {milkChoice.name === opt.name && <Check size={14} className="text-[#c59a68]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-zinc-300 mb-1">Catatan Tambahan (Opsional):</label>
          <input
            type="text"
            placeholder="Contoh: Pisahkan es, jangan terlalu pedas, dll."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
          />
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-[#c59a68] hover:bg-[#d6a977] text-black font-bold rounded-xl text-sm transition shadow-lg shadow-[#c59a68]/20"
        >
          Tambahkan ke Pesanan · {rupiah(product.base_price + milkChoice.price)}
        </button>
      </div>
    </div>
  );
};
