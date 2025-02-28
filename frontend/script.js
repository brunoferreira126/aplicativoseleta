const API_URL = "https://aplicativoseleta-production.up.railway.app";

console.log("✅ API_URL definida como:", API_URL);
axios.defaults.baseURL = API_URL;


// Funções de notificação
function exibirNotificacao(mensagem, tipo = 'success') {
    const notificacao = document.getElementById('notificacao');
    if (!notificacao) return; // Evita erros se o elemento não existir
    notificacao.textContent = mensagem;
    notificacao.style.display = 'block';
    notificacao.className = `notificacao ${tipo}`;
    setTimeout(() => notificacao.style.display = 'none', 3000);
}

// Função para exibir e ocultar o loader
function exibirLoader(exibir) {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = exibir ? 'block' : 'none';
}


// Dados das cidades e taxas
const cidades = {
    Fortaleza: { pedidoMinimo: 60, taxaEntrega: 10 },
    Eusébio: { pedidoMinimo: 60, taxaEntrega: 7 },
    Aquiraz: { pedidoMinimo: 60, taxaEntrega: 7 },
    Pindoretama: { pedidoMinimo: 40, taxaEntrega: 0 },
    Cascavel: { pedidoMinimo: 50, taxaEntrega: 7 },
    Beberibe: { pedidoMinimo: 50, taxaEntrega: 10 },
};

// Função para validar campos de cadastro
function validarFormularioCadastro(data) {
    const telefoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;

    if (!data.nome || data.nome.length < 3) {
        alert('O nome deve ter pelo menos 3 caracteres.');
        return false;
    }
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        alert('Insira um email válido.');
        return false;
    }
    if (!data.telefone || !telefoneRegex.test(data.telefone)) {
        alert('Insira um telefone válido no formato (99) 99999-9999.');
        return false;
    }
    if (!data.enderecoRua || data.enderecoRua.length < 3) {
        alert('A rua deve ter pelo menos 3 caracteres.');
        return false;
    }
    if (!data.enderecoNumero || data.enderecoNumero <= 0) {
        alert('O número do endereço deve ser maior que 0.');
        return false;
    }
    if (!data.senha || data.senha.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.');
        return false;
    }
    return true;
}

/// Cadastro de usuários
document.getElementById("cadastro-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    console.log("Dados enviados para o backend:", data); // 🔍 Debugando os dados no navegador
    console.log("Verificando Axios:", axios);

    try {
        const response = await axios.post(`${API_URL}/cadastro`, JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json"
            }
        });

        exibirNotificacao(response.data.message || "Cadastro realizado com sucesso!", "success");
        setTimeout(() => window.location.href = "/public/index.html", 2000);
    } catch (error) {
        console.error("Erro no cadastro:", error.response?.data || error);
        exibirNotificacao(error.response?.data?.message || "Erro ao realizar cadastro.", "error");
    }
});

// Login de usuário
document.getElementById("login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await axios.post(`${API_URL}/login`, { email: data.email, senha: data.password });


        if (response.status === 200) {
            localStorage.setItem("authToken", response.data.token);
            localStorage.setItem("clienteData", JSON.stringify(response.data.usuario));
            exibirNotificacao("Login realizado com sucesso! Redirecionando...", "success");
            setTimeout(() => window.location.href = "compras.html", 2000);
        }
    } catch (error) {
        if (error.response?.status === 404) {
            exibirNotificacao("Usuário não encontrado. Redirecionando para cadastro...", "error");
            setTimeout(() => window.location.href = "cadastro.html", 2000);
        } else {
            exibirNotificacao(error.response?.data?.message || "Erro no login.", "error");
        }
    }
});


axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('authToken')}`;


// Gerenciamento do carrinho
let carrinho = [];

function adicionarAoCarrinho(nome, preco) {
    const produtoExistente = carrinho.find(item => item.nome === nome);

    if (produtoExistente) {
        produtoExistente.quantidade += 1;
        produtoExistente.total = produtoExistente.quantidade * produtoExistente.preco;
    } else {
        carrinho.push({ nome, preco, quantidade: 1, total: preco });
    }

    atualizarCarrinho();
    salvarCarrinho();
    exibirNotificacao(`Produto "${nome}" adicionado ao carrinho.`);
}

function removerDoCarrinho(nome) {
    carrinho = carrinho.filter(item => item.nome !== nome);
    atualizarCarrinho();
    salvarCarrinho();
    exibirNotificacao(`Produto "${nome}" removido do carrinho.`);
}

// Atualizar visualização do carrinho
function atualizarCarrinho() {
    const tabelaCarrinho = document.getElementById('tabela-carrinho');
    const taxaEntregaElem = document.getElementById('taxa-entrega');
    const totalComEntregaElem = document.getElementById('total-com-entrega');

    if (!tabelaCarrinho) return;

    tabelaCarrinho.innerHTML = '';
    let totalPedido = 0;

    carrinho.forEach((item) => {
        totalPedido += item.total;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>R$${item.preco.toFixed(2)}</td>
            <td>R$${item.total.toFixed(2)}</td>
            <td><button onclick="removerDoCarrinho('${item.nome}')">Remover</button></td>
        `;
        tabelaCarrinho.appendChild(row);
    });

    const clienteData = JSON.parse(localStorage.getItem('clienteData')) || {};
    const cidadeSelecionada = clienteData.cidade;
    const taxaEntrega = cidadeSelecionada && cidades[cidadeSelecionada] ? cidades[cidadeSelecionada].taxaEntrega : 0;

    const totalComEntrega = totalPedido + taxaEntrega;

    document.getElementById('total').textContent = `Total: R$${totalPedido.toFixed(2)}`;
    taxaEntregaElem.textContent = `Taxa de entrega: R$${taxaEntrega.toFixed(2)}`;
    totalComEntregaElem.textContent = `Total com entrega: R$${totalComEntrega.toFixed(2)}`;
}


// Salvar carrinho no localStorage
function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

// Finalizar Pedido
function verificarPedidoMinimo(totalPedido, cidade) {
    const { pedidoMinimo } = cidades[cidade];
    return totalPedido >= pedidoMinimo;
}

function calcularTotaisComEntrega(totalPedido, cidade) {
    const taxaEntrega = cidades[cidade]?.taxaEntrega || 0;
    return {
        totalComEntrega: totalPedido + taxaEntrega,
        taxaEntrega,
    };
}
async function finalizarPedido() {
    console.log("🔄 Iniciando finalização do pedido...");

    if (carrinho.length === 0) {
        exibirNotificacao('❌ O carrinho está vazio. Adicione produtos antes de finalizar o pedido.', 'error');
        return;
    }

    const clienteData = JSON.parse(localStorage.getItem('clienteData')) || {};
    console.log("🟢 Dados do cliente carregados:", clienteData);

    if (!clienteData || !clienteData.nome || !clienteData.cidade) {
        exibirNotificacao('❌ Dados do cliente não encontrados. Faça login novamente.', 'error');
        return;
    }

    const cidadeSelecionada = clienteData.cidade;
    
    if (!cidades[cidadeSelecionada]) {
        exibirNotificacao('❌ Selecione uma cidade válida no cadastro.', 'error');
        return;
    }

    const totalPedido = carrinho.reduce((total, item) => total + item.total, 0);
    const taxaEntrega = cidades[cidadeSelecionada]?.taxaEntrega || 0;
    const totalComEntrega = totalPedido + taxaEntrega;

    // ✅ 🚀 Verificar se o pedido atinge o mínimo exigido
    const pedidoMinimo = cidades[cidadeSelecionada].pedidoMinimo;
    if (totalPedido < pedidoMinimo) {
        exibirNotificacao(`❌ O pedido mínimo para ${cidadeSelecionada} é R$${pedidoMinimo}.`, 'error');
        return;
    }

    console.log("📦 Carrinho:", carrinho);
    console.log("💰 Total do pedido:", totalPedido, " Taxa de entrega:", taxaEntrega, " Total com entrega:", totalComEntrega);

    const pedido = {
        itens: carrinho.map((item) => ({
            nome_produto: item.nome,
            preco: item.preco,
            quantidade: item.quantidade,
            total: item.total
        })),
        totalPedido: parseFloat(totalPedido.toFixed(2)),
        taxaEntrega: parseFloat(taxaEntrega.toFixed(2)),
        totalComEntrega: parseFloat(totalComEntrega.toFixed(2))
    };

    console.log("📨 Enviando pedido ao backend:", pedido);

    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            exibirNotificacao("❌ Usuário não autenticado. Faça login novamente.", "error");
            return;
        }

        const response = await axios.post(`${API_URL}/pedido`, pedido,  {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("✅ Pedido enviado com sucesso:", response.data);
        exibirNotificacao('✅ Pedido enviado com sucesso!', 'success');

        carrinho = [];
        salvarCarrinho();
        atualizarCarrinho();

    } catch (error) {
        console.error('❌ Erro ao finalizar o pedido:', error.response?.data || error);
        exibirNotificacao('❌ Erro ao finalizar o pedido. Tente novamente.', 'error');
    }
}


// Função para carregar pedidos na tela do administrador
   
async function carregarPedidos() {
    try {
        console.log("🔄 Buscando pedidos do backend...");
        const response = await axios.get(`${API_URL}/pedidos`);
        const pedidos = response.data;
        console.log("✅ Pedidos recebidos:", pedidos);

        const tabelaPedidos = document.getElementById("tabela-pedidos");
        if (!tabelaPedidos) {
            console.error("❌ Elemento da tabela não encontrado!");
            return;
        }

        tabelaPedidos.innerHTML = "";

        pedidos.forEach(pedido => {
            if (!pedido.id) {
                console.error("❌ Pedido sem ID:", pedido);
                return;
            }
            
            const row = document.createElement("tr");

            // Montar a lista de produtos do pedido
            let detalhesItens = pedido.itens && Array.isArray(pedido.itens)
                ? pedido.itens.map(item => `${item.quantidade}x ${item.nome_produto} - R$${parseFloat(item.total).toFixed(2)}`).join("<br>")
                : "Sem produtos";
                
            console.log(`📌 Pedido ID gerado na tabela: ${pedido.id}`);

            // Montar endereço completo
            let endereco = `${pedido.rua}, Nº ${pedido.numero}, ${pedido.cidade}`;
            if (pedido.complemento) endereco += `, ${pedido.complemento}`;
            if (pedido.referencia) endereco += ` (Ref: ${pedido.referencia})`;

            row.innerHTML = `
                <td>${pedido.cliente_nome}</td>
                <td>${pedido.telefone}</td>
                <td>${endereco}</td>
                <td>R$${parseFloat(pedido.total_com_entrega).toFixed(2)}</td>
                <td class="${pedido.status === 'Pendente' ? 'pendente' : 'aprovado'}">${pedido.status}</td>
                <td>${detalhesItens}</td>
                <td>
                    ${pedido.status !== "Aprovado" 
                        ? `<button class="btn-concluir" data-id="${pedido.id}">Aprovar</button>` 
                        : "✅ Aprovado"}
                </td>
            `;

            tabelaPedidos.appendChild(row);
        });

        // 🔥 Adiciona eventos aos botões DENTRO da função
        document.querySelectorAll(".btn-concluir").forEach(botao => {
            botao.addEventListener("click", function () {
                const pedidoId = this.getAttribute("data-id");
                console.log(`🟢 Pedido ID enviado para aprovação: ${pedidoId}`);
                aprovarPedido(pedidoId);
            });
        });

    } catch (error) {
        console.error("❌ Erro ao carregar pedidos:", error);
        exibirNotificacao("Erro ao carregar pedidos", "error");
    }
}

// Carregar pedidos ao carregar a página
document.addEventListener("DOMContentLoaded", carregarPedidos);



// Carregar carrinho ao iniciar

function carregarCarrinho() {
    const carrinhoSalvo = localStorage.getItem('carrinho');
    carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
    atualizarCarrinho();
}
carregarCarrinho();

// AQUI COMEÇAMOS O SCRIPT DA PAGÍNA ADMIN



// Login de Administrador
document.getElementById("admin-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageElem = document.getElementById("message");

    try {
        console.log("📤 Enviando dados:", email, password); // 🔍 Verificar se os dados estão certos

        const response = await axios.post(`${API_URL}/admin/login`, { email, password });

        localStorage.setItem("adminToken", response.data.token);
        window.location.href = "admin.html"; // Redireciona após login
    } catch (error) {
        console.error("❌ Erro no login:", error.response?.data || error);
        messageElem.textContent = "Erro no login. Verifique suas credenciais.";
        messageElem.classList.add("error");
    }
});


//só consegue fazer o login se estiver logado em ambos tanto compras como adimin

document.addEventListener("DOMContentLoaded", async () => {
    const paginaAtual = window.location.pathname;
    
    // Páginas que NÃO exigem login
    const paginasPublicas = ["/index.html", "/cadastro.html", "/admin-login.html"];

    if (paginasPublicas.includes(paginaAtual)) {
        return; // Permite acesso sem verificação
    }

    const authToken = localStorage.getItem("authToken");
    const adminToken = localStorage.getItem("adminToken");

    if (paginaAtual === "/admin.html") {
        // Se está na página admin, verificar adminToken
        if (!adminToken) {
            alert("🔴 Acesso restrito! Faça login como administrador.");
            window.location.href = "admin-login.html";
            return;
        }

        try {
           const response = await axios.get(`${API_URL}/admin/verificar`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });

            if (response.data.role !== "admin") {
                throw new Error("Acesso negado! Você não é administrador.");
            }
        } catch (error) {
            localStorage.removeItem("adminToken");
            alert("🔴 Sessão expirada! Faça login novamente.");
            window.location.href = "admin-login.html";
        }
    } else {
        // Se não está na página admin, verificar se é um cliente logado
        if (!authToken) {
            window.location.href = "index.html";
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/usuario/verificar`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (response.data.role !== "cliente") {
                throw new Error("Acesso negado! Você não é cliente.");
            }
        } catch (error) {
            localStorage.removeItem("authToken");
            window.location.href = "index.html";
        }
    }
});

// Função para aprovar o pedido
async function aprovarPedido(pedidoId) {
    try {
        const adminToken = localStorage.getItem("adminToken");

        console.log("📌 Token do Admin:", adminToken); // Verifica se o token está presente
        console.log("📌 ID do pedido recebido:", pedidoId); // Verifica se o pedidoId está correto

        if (!adminToken) {
            exibirNotificacao("❌ Você precisa estar autenticado como administrador.", "error");
            window.location.href = "admin-login.html";
            return;
        }

        if (!pedidoId || isNaN(pedidoId)) {
            console.error("❌ ID do pedido é inválido:", pedidoId);
            exibirNotificacao("❌ ID do pedido é inválido!", "error");
            return;
        }

        const response = await axios.put(`${API_URL}/pedido/aprovar/${pedidoId}`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log("✅ Resposta da API:", response);

        if (response.status === 200) {
            exibirNotificacao("✅ Pedido aprovado com sucesso!", "success");
            carregarPedidos(); // Atualiza a tabela após aprovação
        }
    } catch (error) {
        console.error("❌ Erro ao aprovar pedido:", error.response?.data || error);
        exibirNotificacao("❌ Erro ao aprovar pedido.", "error");
    }
}


// Função Baixar Planilha para Separação 

function baixarPlanilhaProducao() {
    const dataSelecionada = document.getElementById('data-planilha').value;

    if (!dataSelecionada) {
        alert("Selecione uma data para baixar a planilha.");
        return;
    }

   window.location.href = `${API_URL}/gerar-planilha-producao?data=${dataSelecionada}`;
}

function baixarPlanilhaSeparacao() {
    const dataSelecionada = document.getElementById('data-planilha').value;

    if (!dataSelecionada) {
        alert("Selecione uma data para baixar a planilha.");
        return;
    }

    window.location.href = `${API_URL}/gerar-planilha-separacao?data=${dataSelecionada}`;
}