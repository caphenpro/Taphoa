import React, { useMemo, useState } from 'react';
import { Search, Truck, CheckCircle2, Plus } from 'lucide-react';
import { SupplierDebt, SupplierPayment } from '../types';
import { formatDate, formatVND } from '../utils/storage';

interface Props {
  debts: SupplierDebt[];
  payments: SupplierPayment[];
  onRecordPayment: (debtId: string, amount: number, note: string) => void;
  onAddDebt: (supplierName: string, amount: number, note: string) => void;
}

export const SupplierDebtComponent: React.FC<Props> = ({ debts, payments, onRecordPayment, onAddDebt }) => {
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<SupplierDebt | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [newSupplier, setNewSupplier] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState(0);
  const [newDebtNote, setNewDebtNote] = useState('');

  const rows = useMemo(() => debts.filter(d =>
    d.supplierName.toLowerCase().includes(search.toLowerCase()) &&
    d.remainingAmount > 0
  ), [debts, search]);
  const totalDebt = debts.reduce((sum, d) => sum + Math.max(0, d.remainingAmount), 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);

  // Record an opening balance when the shop already owes a supplier.
  const addDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.trim() || newDebtAmount <= 0) return;
    onAddDebt(newSupplier.trim(), newDebtAmount, newDebtNote.trim());
    setShowAddDebt(false); setNewSupplier(''); setNewDebtAmount(0); setNewDebtNote('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || amount <= 0 || amount > target.remainingAmount) return;
    onRecordPayment(target.id, amount, note.trim());
    setTarget(null); setAmount(0); setNote('');
  };

  return <div className="p-3 md:p-6 space-y-4 bg-slate-50 min-h-full">
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Còn nợ nhà cung cấp</div><div className="text-xl font-bold text-rose-600 mt-1">{formatVND(totalDebt)}</div><div className="text-xs text-slate-400 mt-1">{rows.length} khoản chưa trả hết</div></div>
      <div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Đã thanh toán cho nhà cung cấp</div><div className="text-xl font-bold text-emerald-700 mt-1">{formatVND(totalPaid)}</div><div className="text-xs text-slate-400 mt-1">Tổng các đợt nhập đã ghi nhận</div></div>
    </div>
    <section className="bg-white border rounded-xl overflow-hidden">
      <div className="p-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div><h2 className="font-bold text-slate-900 flex items-center gap-2"><Truck className="w-5 h-5 text-sky-600"/> Sổ nợ nhà cung cấp</h2><p className="text-xs text-slate-500 mt-1">Tự ghi nợ khi nhập hàng hoặc thêm số nợ đang có.</p></div>
        <div className="flex flex-col sm:flex-row gap-2"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm nhà cung cấp..." className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full sm:w-64"/></div><button onClick={()=>setShowAddDebt(true)} className="px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Plus className="w-4 h-4"/> Ghi nợ đầu kỳ</button></div>
      </div>
      {rows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500"/>Hiện không có khoản nợ nhà cung cấp.</div> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3 text-left">Ngày nhập</th><th className="p-3 text-left">Nhà cung cấp</th><th className="p-3 text-left">Ghi chú</th><th className="p-3 text-right">Tổng tiền</th><th className="p-3 text-right">Đã trả</th><th className="p-3 text-right">Còn nợ</th><th className="p-3">Thao tác</th></tr></thead><tbody className="divide-y">{rows.map(d=><tr key={d.id}><td className="p-3 whitespace-nowrap">{formatDate(d.date)}</td><td className="p-3 font-semibold">{d.supplierName}</td><td className="p-3 text-slate-500">{d.note || 'Nhập hàng'}</td><td className="p-3 text-right">{formatVND(d.totalAmount)}</td><td className="p-3 text-right text-emerald-700">{formatVND(d.paidAmount)}</td><td className="p-3 text-right font-bold text-rose-600">{formatVND(d.remainingAmount)}</td><td className="p-3 text-center"><button onClick={()=>{setTarget(d);setAmount(d.remainingAmount);setNote('');}} className="px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold">Trả nợ</button></td></tr>)}</tbody></table></div>}
    </section>
    <section className="bg-white border rounded-xl overflow-hidden"><div className="p-4 border-b font-bold">Lịch sử trả nhà cung cấp</div>{payments.length===0?<p className="p-5 text-sm text-slate-500">Chưa có giao dịch thanh toán.</p>:<div className="divide-y">{payments.slice(0,50).map(p=><div key={p.id} className="p-3 flex justify-between gap-3 text-sm"><div><div className="font-semibold">{p.supplierName}</div><div className="text-xs text-slate-500">{formatDate(p.date)} · {p.note || 'Thanh toán công nợ'}</div></div><div className="font-bold text-emerald-700 whitespace-nowrap">{formatVND(p.amount)}</div></div>)}</div>}</section>
    {showAddDebt && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={addDebt} className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3 shadow-xl"><h3 className="font-bold text-lg">Ghi nợ nhà cung cấp</h3><label className="block text-sm font-semibold">Tên nhà cung cấp</label><input required value={newSupplier} onChange={e=>setNewSupplier(e.target.value)} className="w-full border rounded-lg p-3" placeholder="Tên đại lý / nhà phân phối"/><label className="block text-sm font-semibold">Số tiền còn nợ</label><input type="number" min="1" required value={newDebtAmount} onChange={e=>setNewDebtAmount(Number(e.target.value)||0)} className="w-full border rounded-lg p-3 text-lg font-bold"/><label className="block text-sm font-semibold">Ghi chú</label><input value={newDebtNote} onChange={e=>setNewDebtNote(e.target.value)} className="w-full border rounded-lg p-3" placeholder="Nợ trước khi dùng ứng dụng..."/><div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowAddDebt(false)} className="px-4 py-2 border rounded-lg">Hủy</button><button type="submit" disabled={!newSupplier.trim()||newDebtAmount<=0} className="px-4 py-2 bg-sky-600 text-white rounded-lg font-bold">Lưu khoản nợ</button></div></form></div>}
    {target && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={submit} className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3 shadow-xl"><h3 className="font-bold text-lg">Thanh toán công nợ</h3><p className="text-sm text-slate-600">{target.supplierName} · Còn nợ {formatVND(target.remainingAmount)}</p><label className="block text-sm font-semibold">Số tiền trả</label><input type="number" min="1" max={target.remainingAmount} required value={amount} onChange={e=>setAmount(Number(e.target.value)||0)} className="w-full border rounded-lg p-3 text-lg font-bold"/><label className="block text-sm font-semibold">Ghi chú</label><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Tiền mặt / chuyển khoản..." className="w-full border rounded-lg p-3"/><div className="flex justify-end gap-2"><button type="button" onClick={()=>setTarget(null)} className="px-4 py-2 border rounded-lg">Hủy</button><button type="submit" disabled={amount<=0||amount>target.remainingAmount} className="px-4 py-2 bg-sky-600 text-white rounded-lg font-bold disabled:opacity-50">Lưu thanh toán</button></div></form></div>}
  </div>;
};
