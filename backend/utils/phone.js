function normalizeSouthAfricanNumber(input) {
  if (!input) return null;

  let num = input.replace(/[^\d+]/g, "");

  if (num.startsWith("+")) num = num.slice(1);

  if (num.startsWith("0")) {
    num = "27" + num.slice(1);
  }

  if (num.startsWith("27")) {
    return "+27" + num.slice(2);
  }

  return null;
}

module.exports = normalizeSouthAfricanNumber