
// Sempre iniciar na tela de login
if (window.location.pathname === "/" || window.location.pathname.includes("index.html")) {
    localStorage.removeItem("clienteData");
}


// Criar usuário demo automaticamente
function criarUsuariosDemo(){

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || []

    const existe = usuarios.find(u => u.email === "cliente@seleta.com")

    if(!existe){

        usuarios.push({
            nome: "Cliente Teste",
            email: "cliente@seleta.com",
            senha: "123456",
            telefone: "85999999999",
            cidade: "Fortaleza",
            rua: "Rua das Frutas",
            numero: "100"
        })

        localStorage.setItem("usuarios",JSON.stringify(usuarios))

        console.log("Usuário demo criado")
    }

}

criarUsuariosDemo()

criarUsuariosDemo()
// =============================
// SISTEMA DEMO SELETA
// =============================

function exibirNotificacao(msg, tipo="success"){
    const n = document.getElementById("notificacao")
    if(!n) return

    n.innerText = msg
    n.style.display="block"
    n.className=`notificacao ${tipo}`

    setTimeout(()=>{n.style.display="none"},3000)
}


// =============================
// CADASTRO
// =============================

document.getElementById("cadastro-form")?.addEventListener("submit",(e)=>{

    e.preventDefault()

    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData.entries())

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || []

    usuarios.push(data)

    localStorage.setItem("usuarios",JSON.stringify(usuarios))

    exibirNotificacao("Cadastro realizado!")

    setTimeout(()=>{
        window.location.href="index.html"
    },1500)

})


// =============================
// LOGIN CLIENTE
// =============================

document.getElementById("login-form")?.addEventListener("submit",(e)=>{

    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || []

    const usuario = usuarios.find(u=>u.email===email && u.senha===password)

    if(!usuario){

        exibirNotificacao("Usuário não encontrado","error")
        return
    }

    localStorage.setItem("clienteData",JSON.stringify(usuario))

    exibirNotificacao("Login realizado!")

    setTimeout(()=>{
        window.location.href="compras.html"
    },1500)

})
// =============================
// LOGOUT CLIENTE E ADMIN
// =============================

function logoutCliente() {
    localStorage.removeItem("clienteData");
    localStorage.removeItem("carrinho");
    window.location.href = "index.html";
}

function logoutAdmin() {
    localStorage.removeItem("adminLogado");
    window.location.href = "admin-login.html";
}

// =============================
// CARRINHO
// =============================

let carrinho = JSON.parse(localStorage.getItem("carrinho")) || []

function adicionarAoCarrinho(nome,preco){

    const item = carrinho.find(p=>p.nome===nome)

    if(item){

        item.quantidade++
        item.total = item.quantidade * item.preco

    }else{

        carrinho.push({
            nome,
            preco,
            quantidade:1,
            total:preco
        })

    }

    salvarCarrinho()
    atualizarCarrinho()

}

function removerDoCarrinho(nome){

    carrinho = carrinho.filter(i=>i.nome!==nome)

    salvarCarrinho()
    atualizarCarrinho()

}

function salvarCarrinho(){

    localStorage.setItem("carrinho",JSON.stringify(carrinho))

}

function atualizarCarrinho(){

    const tabela = document.getElementById("tabela-carrinho")

    if(!tabela) return

    tabela.innerHTML=""

    let total=0

    carrinho.forEach(item=>{

        total+=item.total

        const row=document.createElement("tr")

        row.innerHTML=`
        <td>${item.nome}</td>
        <td>${item.quantidade}</td>
        <td>R$${item.preco.toFixed(2)}</td>
        <td>R$${item.total.toFixed(2)}</td>
        <td><button onclick="removerDoCarrinho('${item.nome}')">Remover</button></td>
        `

        tabela.appendChild(row)

    })

    const totalElem=document.getElementById("total")

    if(totalElem) totalElem.innerText=`Total: R$${total.toFixed(2)}`

}


// =============================
// FUNÇÃO LIMPAR CARRINHO
// =============================
function limparCarrinho(){

    carrinho=[]

    localStorage.removeItem("carrinho")

    atualizarCarrinho()

}


// =============================
// FINALIZAR PEDIDO
// =============================

function finalizarPedido(){

    const cliente = JSON.parse(localStorage.getItem("clienteData"))

    if(!cliente){

        alert("Faça login")
        return
    }

    if(carrinho.length===0){

        alert("Carrinho vazio")
        return
    }

    let pedidos = JSON.parse(localStorage.getItem("pedidos")) || []

    const novoPedido={

        id:Date.now(),

        cliente_nome:cliente.nome,
        telefone:cliente.telefone,
        cidade:cliente.cidade,
        rua:cliente.rua,
        numero:cliente.numero,

        itens:carrinho,

        total_com_entrega:carrinho.reduce((t,i)=>t+i.total,0),

        status:"Pendente"

    }

    pedidos.push(novoPedido)

    localStorage.setItem("pedidos",JSON.stringify(pedidos))

    carrinho=[]
    salvarCarrinho()

    alert("Pedido enviado!")

    atualizarCarrinho()

}



// =============================
// ADMIN LOGIN
// =============================

document.getElementById("admin-login-form")?.addEventListener("submit",(e)=>{

    e.preventDefault()

    const email=document.getElementById("email").value
    const senha=document.getElementById("password").value

    if(email==="admin@seleta.com" && senha==="123456"){

        localStorage.setItem("adminLogado","true")

        window.location.href="admin.html"

    }else{

        alert("Login inválido")

    }

})


// =============================
// CARREGAR PEDIDOS ADMIN
// =============================

function carregarPedidos(){

    const tabela=document.getElementById("tabela-pedidos")

    if(!tabela) return

    const pedidos = JSON.parse(localStorage.getItem("pedidos")) || []

    tabela.innerHTML=""

    pedidos.forEach(p=>{

        const row=document.createElement("tr")

        const itens = p.itens.map(i=>`${i.quantidade}x ${i.nome}`).join("<br>")

        row.innerHTML=`

        <td>${p.cliente_nome}</td>
        <td>${p.telefone}</td>
        <td>${p.rua}, ${p.numero}</td>
        <td>R$${p.total_com_entrega.toFixed(2)}</td>
        <td>${p.status}</td>
        <td>${itens}</td>

        <td>

        ${p.status==="Pendente"
        ?`<button onclick="aprovarPedido(${p.id})">Aprovar</button>`
        :"Aprovado"}

        </td>
        `

        tabela.appendChild(row)

    })

}



// =============================
// APROVAR PEDIDO
// =============================

function aprovarPedido(id){

    let pedidos = JSON.parse(localStorage.getItem("pedidos")) || []

    pedidos = pedidos.map(p=>{

        if(p.id===id){

            p.status="Aprovado"

        }

        return p

    })

    localStorage.setItem("pedidos",JSON.stringify(pedidos))

    carregarPedidos()

}



// =============================
// INICIAR CARRINHO
// =============================

document.addEventListener("DOMContentLoaded",()=>{

    atualizarCarrinho()

})

// Atualizar pedidos automaticamente no admin
document.addEventListener("DOMContentLoaded", () => {

    atualizarCarrinho()

    if (window.location.pathname.includes("admin.html")) {

        carregarPedidos()

        setInterval(() => {
            carregarPedidos()
        }, 2000)

    }

})