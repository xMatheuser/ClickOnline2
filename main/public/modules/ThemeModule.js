const themeToggleButton = document.getElementById('theme-toggle');

export function initTheme() {
  // Inicializa o tema imediatamente
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleButton.textContent = 'Modo Claro';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleButton.textContent = 'Modo Noturno';
  }

  // Adiciona o listener depois
  themeToggleButton.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  themeToggleButton.textContent = isDarkMode ? 'Modo Claro' : 'Modo Noturno';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}
