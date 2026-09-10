import React, { useState, useEffect } from 'react';
import { ParsedLineResult } from '../types';

interface PrintableDispatchSheetProps {
  results: ParsedLineResult[];
}

export const PrintableDispatchSheet: React.FC<PrintableDispatchSheetProps> = ({ results }) => {
  const [technicianName, setTechnicianName] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('dispatch_technician_name');
    if (stored) setTechnicianName(stored);

    const handleUpdateName = (e: any) => {
      setTechnicianName(e.detail || '');
    };

    window.addEventListener('update-technician-name', handleUpdateName);
    return () => window.removeEventListener('update-technician-name', handleUpdateName);
  }, []);

  const itemsToPrint = results.filter(r => r.selected);

  return (
    <div className="hidden print:block print:w-full print:m-0 print:p-0 bg-white text-black font-sans leading-tight">
      {/* Header: Only Technician Name and total items */}
      <div className="border-b-2 border-black pb-1.5 mb-2 flex items-center justify-between text-[11px] font-mono">
        <div>
          <span className="font-bold">NOMBRE DEL TÉCNICO: </span>
          {technicianName ? (
            <span className="font-bold underline uppercase text-xs ml-1">{technicianName}</span>
          ) : (
            <span className="inline-block border-b border-black w-60 ml-1">&nbsp;</span>
          )}
        </div>
        <div className="text-right font-bold">
          <span>TOTAL ÍTEMS: </span>
          <span className="text-xs ml-1">{itemsToPrint.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border border-black text-[10px] font-sans">
        <thead>
          <tr className="bg-neutral-100 border-b-2 border-black font-mono font-bold text-[10px] uppercase">
            <th className="border border-black py-1 px-1.5 text-center w-8">CHECK</th>
            <th className="border border-black py-1 px-1.5 text-center w-10">CANT.</th>
            <th className="border border-black py-1 px-1.5 text-left w-20">CÓDIGO</th>
            <th className="border border-black py-1 px-1.5 text-left">DESCRIPCIÓN DE MATERIAL / HERRAMIENTA</th>
            <th className="border border-black py-1 px-1.5 text-center w-20">UBICACIÓN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {itemsToPrint.map((row, index) => {
            const item = row.matchedItem;
            return (
              <tr key={row.id || index} className="border-b border-black" style={{ pageBreakInside: 'avoid' }}>
                {/* Checkbox box */}
                <td className="border border-black py-1 px-1 text-center align-middle">
                  <div className="w-3.5 h-3.5 border border-black inline-block align-middle" />
                </td>

                {/* Requested Qty */}
                <td className="border border-black py-1 px-1.5 text-center font-mono font-bold text-xs">
                  {row.requestedQty}
                </td>

                {/* Code */}
                <td className="border border-black py-1 px-1.5 font-mono font-bold text-[10px]">
                  {item ? item.cod_arti : (
                    <span className="text-neutral-500 italic">S/C</span>
                  )}
                </td>

                {/* Description */}
                <td className="border border-black py-1 px-1.5">
                  <span className="font-bold text-black text-[10px] uppercase">
                    {item ? item.descripcion : row.detectedTerm}
                  </span>
                  {item && item.unidad && (
                    <span className="text-[9px] text-neutral-600 font-mono ml-2 font-normal">
                      ({item.unidad})
                    </span>
                  )}
                </td>

                {/* Location */}
                <td className="border border-black py-1 px-1.5 text-center font-mono font-bold text-[10px]">
                  {item && item.ubicacion ? item.ubicacion : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
