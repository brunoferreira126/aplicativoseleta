const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const ExcelJS = require("exceljs");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 8080;
const cors = require('cors');

console.log("Iniciando servidor...");




console.log("🔍 MYSQLHOST:", process.env.MYSQLHOST);
console.log("🔍 MYSQLUSER:", process.env.MYSQLUSER ? "OK" : "NÃO DEFINIDO");
console.log("🔍 MYSQLDATABASE:", process.env.MYSQLDATABASE);
console.log("🔍 MYSQLPORT:", process.env.MYSQLPORT);



// Conexão com o banco de dados
const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Erro ao conectar ao banco de dados:", err.message);
    } else {
        console.log("✅ Conectado ao banco de dados!");
        connection.release();
    }
}); 


// Middlewares
const allowedOrigins = [
    'https://seltahortifrutiaplicativo.netlify.app',
    'http://localhost:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origem não permitida'));
        }
    },
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true
}));

// Middleware de erro para CORS
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Erro interno no servidor", error: err.message });
});

// Configuração do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para autenticação de token JWT
const autenticarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({ message: 'Acesso negado!' });
    }

    const tokenFormatado = token.replace("Bearer ", "");

    jwt.verify(tokenFormatado, process.env.JWT_SECRET || 'segredo', (err, usuario) => {
        if (err) return res.status(403).json({ message: 'Token inválido!' });
        req.usuario = usuario;
        next();
    });
};

// Teste do servidor
app.get("/", (req, res) => {
    res.send("Servidor está rodando corretamente!");
});

// Rota para cadastro de usuários
app.post('/cadastro',
    [
        body('nome').notEmpty().withMessage('Nome é obrigatório'),
        body('email').isEmail().withMessage('E-mail inválido'),
        body('telefone').notEmpty().withMessage('Telefone é obrigatório'),
        body('cidade').notEmpty().withMessage('Cidade é obrigatória'),
        body('rua').notEmpty().withMessage('Rua é obrigatória'),
        body('numero').notEmpty().withMessage('Número é obrigatório'),
        body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { nome, email, telefone, cidade, rua, numero, complemento, referencia, senha } = req.body;

            const [rows] = await db.promise().query("SELECT * FROM usuarios WHERE email = ?", [email]);
            if (rows.length > 0) {
                return res.status(409).json({ message: "Este e-mail já está cadastrado." });
            }

            const hashedPassword = await bcrypt.hash(senha, 10);
            const query = "INSERT INTO usuarios (nome, email, telefone, cidade, rua, numero, complemento, referencia, senha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await db.promise().query(query, [nome, email, telefone, cidade, rua, numero, complemento, referencia, hashedPassword]);

            res.status(201).json({ message: "Cadastro realizado com sucesso!" });
        } catch (error) {
            console.error("Erro no cadastro:", error);
            res.status(500).json({ message: "Erro ao processar o cadastro." });
        }
    }
);

// Rota para login
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ message: "Email e senha são obrigatórios." });
        }

        const [rows] = await db.promise().query("SELECT * FROM usuarios WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        const usuario = rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaCorreta) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET || "segredo", { expiresIn: "1h" });

        res.status(200).json({ message: "Login realizado com sucesso!", token, usuario });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro ao processar login.", error: error.message });
    }
});

// Rota para buscar todos os pedidos (corrigida)
app.get("/pedidos", async (req, res) => {
    try {
        console.log("🔄 Buscando pedidos do banco...");

        const [rows] = await db.promise().query(`
            SELECT 
                p.id, p.total, p.taxa_entrega, p.total_com_entrega, p.status, p.criado_em,
                u.nome AS cliente_nome, u.telefone, u.cidade, u.rua, u.numero, u.complemento, u.referencia,
                i.nome_produto, i.preco, i.quantidade, i.total
            FROM pedidos p
            JOIN usuarios u ON p.cliente_id = u.id
            JOIN itens_pedido i ON p.id = i.pedido_id
            ORDER BY p.id DESC
        `);

        console.log("📌 Dados brutos retornados do banco:", rows);

        if (!rows || rows.length === 0) {
            console.warn("⚠️ Nenhum pedido encontrado no banco.");
            return res.status(404).json({ message: "Nenhum pedido encontrado." });
        }

        // Agrupar os itens por pedido
        const pedidosMap = new Map();
        rows.forEach(pedido => {
            const { id, nome_produto, preco, quantidade, total, ...pedidoInfo } = pedido;
            if (!pedidosMap.has(id)) {
                pedidosMap.set(id, { ...pedidoInfo, itens: [] });
            }
            pedidosMap.get(id).itens.push({ nome_produto, preco, quantidade, total });
        });

        const pedidosFinal = Array.from(pedidosMap.values());
        console.log("✅ Pedidos processados:", pedidosFinal);

        res.json(pedidosFinal);
    } catch (error) {
        console.error("❌ Erro ao buscar pedidos:", error);
        res.status(500).json({ message: "Erro ao buscar pedidos.", error: error.message });
    }
});

// Rota para registrar um pedido
app.post("/pedido", autenticarToken, async (req, res) => {
    try {
        const { itens, totalPedido, taxaEntrega, totalComEntrega } = req.body;
        const usuario = req.usuario;

        if (!itens || itens.length === 0) {
            return res.status(400).json({ message: "O carrinho está vazio." });
        }

        const [result] = await db.promise().query(
            "INSERT INTO pedidos (cliente_id, total, taxa_entrega, total_com_entrega, status) VALUES (?, ?, ?, ?, ?)",
            [usuario.id, totalPedido, taxaEntrega, totalComEntrega, "Pendente"]
        );

        const pedidoId = result.insertId;

        for (let item of itens) {
            await db.promise().query(
                "INSERT INTO itens_pedido (pedido_id, nome_produto, preco, quantidade, total) VALUES (?, ?, ?, ?, ?)",
                [pedidoId, item.nome_produto, item.preco, item.quantidade, item.total]
            );
        }

        res.status(201).json({ message: "Pedido registrado com sucesso!", pedidoId });
    } catch (error) {
        console.error("Erro ao registrar pedido:", error);
        res.status(500).json({ message: "Erro ao registrar pedido." });
    }
});
console.log("📌 Pedidos retornados do banco:", pedidos);


// AQUI COMEÇA AS ROTAS PARA A PÁGINA ADMIN 

// Criar login para ADMIN
app.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;

    // Buscar o admin no banco
    const [rows] = await db.promise().query("SELECT * FROM admins WHERE email = ?", [email]);

    if (rows.length === 0) {
        return res.status(401).json({ message: "E-mail não encontrado" });
    }

    const admin = rows[0];
    const senhaCorreta = await bcrypt.compare(password, admin.senha);

    if (!senhaCorreta) {
        return res.status(401).json({ message: "Senha incorreta" });
    }

    // Gerar um token JWT
    const token = jwt.sign({ id: admin.id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.status(200).json({ message: "Login realizado com sucesso", token });
});

// Middleware para verificar se o usuário é um administrador

const verificarAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Acesso negado!' });

    const tokenFormatado = token.replace("Bearer ", "");

    jwt.verify(tokenFormatado, process.env.JWT_SECRET || 'segredo', (err, usuario) => {
        if (err) return res.status(403).json({ message: 'Token inválido!' });

        if (usuario.role !== "admin") {
            return res.status(403).json({ message: "Acesso permitido apenas para administradores!" });
        }

        req.usuario = usuario;
        next();
    });
};

//verifica se ainda está conectado com adm
app.get("/admin/verificar", verificarAdmin, (req, res) => {
    res.json({ message: "Admin autenticado.", role: req.usuario.role });
});

app.get("/usuario/verificar", autenticarToken, (req, res) => {
    res.json({ message: "Usuário autenticado.", role: "cliente" });
});

// rota aprovar pedido pelo admn"
app.put("/pedido/aprovar/:id", verificarAdmin, async (req, res) => {
    try {
        const pedidoId = parseInt(req.params.id, 10); // Convertendo para número inteiro
        console.log(`📌 Tentando aprovar pedido. ID recebido: ${pedidoId}`);

        if (isNaN(pedidoId)) {
            console.log("❌ ID do pedido inválido!");
            return res.status(400).json({ message: "ID do pedido inválido!" });
        }

        const [result] = await db.promise().query(
            "UPDATE pedidos SET status = 'Aprovado' WHERE id = ?", 
            [pedidoId]
        );

        if (result.affectedRows === 0) {
            console.log("❌ Pedido não encontrado!");
            return res.status(404).json({ message: "Pedido não encontrado!" });
        }

        console.log("✅ Pedido aprovado com sucesso!");
        res.json({ message: "✅ Pedido aprovado com sucesso!" });

    } catch (error) {
        console.error("❌ Erro ao aprovar pedido:", error);
        res.status(500).json({ message: "Erro ao aprovar pedido.", error: error.message });
    }
});




// Rota para gerar planilha de produção
app.get("/gerar-planilha-producao", async (req, res) => {
    try {
        const { data } = req.query;
        if (!data) {
            return res.status(400).json({ message: "Data inválida." });
        }

        const [pedidos] = await db.promise().query(`
            SELECT i.nome_produto, SUM(i.quantidade) as quantidade_total
            FROM pedidos p
            JOIN itens_pedido i ON p.id = i.pedido_id
            WHERE p.status = 'Aprovado' AND DATE(p.criado_em) = ?
            GROUP BY i.nome_produto
        `, [data]);

        if (pedidos.length === 0) {
            return res.status(404).json({ message: "Nenhum pedido encontrado para essa data." });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Produção");

        worksheet.columns = [
            { header: "Produto", key: "nome_produto", width: 30 },
            { header: "Quantidade Total", key: "quantidade_total", width: 20 },
        ];

        pedidos.forEach(pedido => {
            worksheet.addRow(pedido);
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=producao_${data}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("❌ Erro ao gerar planilha de produção:", error);
        res.status(500).json({ message: "Erro ao gerar planilha de produção." });
    }
});
// Rota para gerar planilha de separação
app.get("/gerar-planilha-separacao", async (req, res) => {
    try {
        const { data } = req.query;
        if (!data) {
            return res.status(400).json({ message: "Data inválida." });
        }

        const [pedidos] = await db.promise().query(`
            SELECT p.id, u.nome as cliente, u.cidade, u.rua, u.numero, i.nome_produto, i.quantidade
            FROM pedidos p
            JOIN usuarios u ON p.cliente_id = u.id
            JOIN itens_pedido i ON p.id = i.pedido_id
            WHERE p.status = 'Aprovado' AND DATE(p.criado_em) = ?
            ORDER BY p.id
        `, [data]);

        if (pedidos.length === 0) {
            return res.status(404).json({ message: "Nenhum pedido encontrado para essa data." });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Separação");

        worksheet.columns = [
            { header: "Pedido ID", key: "id", width: 10 },
            { header: "Cliente", key: "cliente", width: 25 },
            { header: "Cidade", key: "cidade", width: 15 },
            { header: "Endereço", key: "rua", width: 25 },
            { header: "Número", key: "numero", width: 10 },
            { header: "Produto", key: "nome_produto", width: 30 },
            { header: "Quantidade", key: "quantidade", width: 10 }
        ];

        worksheet.addRows(pedidos);

        res.setHeader("Content-Disposition", `attachment; filename=separacao_${data}.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Erro ao gerar planilha de separação:", error);
        res.status(500).json({ message: "Erro ao gerar planilha." });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
}).on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor:', err);
});


