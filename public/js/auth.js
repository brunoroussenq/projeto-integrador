const userLogado = localStorage.getItem('os_user');
const path = window.location.pathname;
if (!userLogado && !path.includes('login.html')) { window.location.href = 'login.html'; } 
else if (userLogado && path.includes('login.html')) { window.location.href = 'index.html'; }
const formLogin = document.getElementById('formLogin');
if(formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;
        const alertBox = document.getElementById('loginAlert');
        try {
            const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
            const data = await res.json();
            if(data.success) { localStorage.setItem('os_user', JSON.stringify(data.user)); window.location.href = 'index.html'; } 
            else { alertBox.textContent = data.message; alertBox.classList.remove('d-none'); }
        } catch (err) { alertBox.textContent = "Erro de conexão com o banco."; alertBox.classList.remove('d-none'); }
    });
}
function logout() { localStorage.removeItem('os_user'); window.location.href = 'login.html'; }
document.addEventListener('DOMContentLoaded', () => {
    if(userLogado && document.getElementById('userNomeDisplay')) {
        const user = JSON.parse(userLogado);
        document.getElementById('userNomeDisplay').textContent = "Olá, " + user.nome;
    }
});