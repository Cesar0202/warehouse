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
    <div className="hidden print:block print:w-full print:m-0 print:p-4 bg-white text-black font-sans leading-normal">
      {/* Header: Only Technician Name and total items */}
      <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="font-bold">NOMBRE DEL TÉCNICO: </span>
          {technicianName ? (
            <span className="font-bold underline uppercase text-sm ml-1">{technicianName}</span>
          ) : (
            <span className="inline-block border-b border-black w-60 ml-1">&nbsp;</span>
          )}
        </div>
        <div className="text-right font-bold">
          <span>TOTAL ÍTEMS: </span>
          <span className="text-sm ml-1">{itemsToPrint.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border border-black text-xs font-sans">
        <thead>
          <tr className="bg-neutral-100 border-b-2 border-black font-mono font-bold text-[11px] uppercase">
            <th className="border border-black p-2 text-center w-12">CHECK</th>
            <th className="border border-black p-2 text-center w-12">CANT.</th>
            <th className="border border-black p-2 text-left w-24">CÓDIGO</th>
            <th className="border border-black p-2 text-left">DESCRIPCIÓN DE MATERIAL / HERRAMIENTA</th>
            <th className="border border-black p-2 text-center w-24">UBICACIÓN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {itemsToPrint.map((row, index) => {
            const item = row.matchedItem;
            return (
              <tr key={row.id || index} className="border-b border-black">
                {/* Checkbox box */}
                <td className="border border-black p-2 text-center">
                  <div className="w-4 h-4 border border-black inline-block align-middle" />
                </td>

                {/* Requested Qty */}
                <td className="border border-black p-2 text-center font-mono font-bold text-sm">
                  {row.requestedQty}
                </td>

                {/* Code */}
                <td className="border border-black p-2 font-mono font-bold">
                  {item ? item.cod_arti : (
                    <span className="text-neutral-500 italic">S/C</span>
                  )}
                </td>

                {/* Description */}
                <td className="border border-black p-2">
                  <p className="font-bold text-black text-xs">
                    {item ? item.descripcion : row.detectedTerm}
                  </p>
                  {item && item.unidad && (
                    <span className="text-[10px] text-neutral-600 font-mono">
                      Unidad: {item.unidad}
                    </span>
                  )}
                </td>

                {/* Location */}
                <td className="border border-black p-2 text-center font-mono font-bold text-xs">
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
