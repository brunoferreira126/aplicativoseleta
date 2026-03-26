// =============================
// CONFIGURAÇÃO DE CIDADES
// =============================
const cidades = {
    Fortaleza: { taxa: 15, minimo: 80 },
    Eusébio: { taxa: 13, minimo: 80 },
    Aquiraz: { taxa: 12, minimo: 80 },
    Pindoretama: { taxa: 0, minimo: 80 },
    Cascavel: { taxa: 10, minimo: 80 },
    Beberibe: { taxa: 12, minimo: 80 }
};

// Sempre iniciar na tela de login
if (window.location.pathname === "/" || window.location.pathname.includes("index.html")) {
    localStorage.removeItem("clienteData");
}

// =============================
// USUÁRIO DEMO
// =============================
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
    }
}
criarUsuariosDemo()

// =============================
// NOTIFICAÇÃO
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

    setTimeout(()=> window.location.href="compras.html",1000)
})

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
        carrinho.push({ nome, preco, quantidade:1, total:preco })
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

// =============================
// ATUALIZAR CARRINHO (COM TAXA)
// =============================
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

    const cliente = JSON.parse(localStorage.getItem("clienteData")) || {}
    const cidade = cliente.cidade

    let taxa = 0
    let minimo = 0

    if(cidade && cidades[cidade]){
        taxa = cidades[cidade].taxa
        minimo = cidades[cidade].minimo
    }

    const totalComEntrega = total + taxa

    document.getElementById("total").innerText = `Total: R$${total.toFixed(2)}`

    const taxaElem = document.getElementById("taxa-entrega")
    const totalFinalElem = document.getElementById("total-com-entrega")

    if(taxaElem) taxaElem.innerText = `Taxa: R$${taxa.toFixed(2)}`
    if(totalFinalElem) totalFinalElem.innerText = `Total final: R$${totalComEntrega.toFixed(2)}`
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

    const cidade = cliente.cidade
    const config = cidades[cidade]

    if(!config){
        alert("Cidade inválida")
        return
    }

    let total = carrinho.reduce((t,i)=>t+i.total,0)

    if(total < config.minimo){
        alert(`Pedido mínimo para ${cidade} é R$${config.minimo}`)
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
        itens: JSON.parse(JSON.stringify(carrinho)),
        total_com_entrega: total + config.taxa,
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
// ADMIN
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

function carregarPedidos(){
    const tabela=document.getElementById("tabela-pedidos")
    if(!tabela) return

    const pedidos = JSON.parse(localStorage.getItem("pedidos")) || []
    tabela.innerHTML=""

    pedidos.forEach(p=>{
        const row=document.createElement("tr")

        const itens = p.itens.map(i=>`${i.quantidade}x ${i.nome}`).join("<br>")

        row.innerHTML=`
        <td>
    ${p.cliente_nome}<br>
    <small>${p.cidade}</small>
</td>
        <td>${p.telefone}</td>
        <td>${p.rua}, ${p.numero}</td>
        <td>R$${p.total_com_entrega.toFixed(2)}</td>
        <td style="color:${p.status === "Pendente" ? "orange" : "green"}">
    ${p.status}
</td>
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

// PROTEGER TELA ADMIN
if (window.location.pathname.includes("admin.html")) {

    const admin = localStorage.getItem("adminLogado")

    if(!admin){
        alert("Acesso negado")
        window.location.href = "admin-login.html"
    }

}
// =============================
// INIT
// =============================
document.addEventListener("DOMContentLoaded",()=>{

    atualizarCarrinho()

    if (window.location.pathname.includes("admin.html")) {
        carregarPedidos()
        setInterval(carregarPedidos,2000)
    }
})