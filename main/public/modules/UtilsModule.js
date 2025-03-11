export function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const base = Math.floor(Math.log(num) / Math.log(1000));
    const suffix = suffixes[base] || `e${base * 3}`;
    const formatted = (num / Math.pow(1000, base)).toFixed(2);
    return formatted + suffix;
  }
  
  export function showTooltip(event, text) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
  }
  
  export function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
  }