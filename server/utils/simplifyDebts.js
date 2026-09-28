function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];

  for (const b of balances) {
    if (b.net > 0.01) creditors.push({ ...b });
    else if (b.net < -0.01) debtors.push({ ...b, net: Math.abs(b.net) });
  }

  creditors.sort((a, b) => b.net - a.net);
  debtors.sort((a, b) => b.net - a.net);

  const transactions = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].net, debtors[j].net);
    transactions.push({
      from: debtors[j].memberId,
      fromName: debtors[j].name,
      to: creditors[i].memberId,
      toName: creditors[i].name,
      amount: Math.round(amount * 100) / 100
    });
    creditors[i].net -= amount;
    debtors[j].net -= amount;

    if (creditors[i].net < 0.01) i++;
    if (debtors[j].net < 0.01) j++;
  }

  return transactions;
}

module.exports = simplifyDebts;
