import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MemberSpendingBar({ data }) {
  if (!data || data.length === 0) {
    return <p className="empty-state">No spending data for chart</p>;
  }

  return (
    <div className="chart-container">
      <h4>Spending by Member</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(v) => `Rs.${v}`} />
          <Tooltip formatter={(value) => `Rs.${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
          <Bar dataKey="total_paid" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
