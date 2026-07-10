const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');

// === 1. CONFIGURAÇÃO DO SERVIDOR WEB E PING (RENDER) ===
const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.get('/', (req, res) => res.send('Assistente de Vendas Online!'));
app.get('/ping', (req, res) => res.send('pong'));

app.listen(PORT, () => {
    console.log(`Servidor web rodando na porta ${PORT}`);
    
    // Ping automático a cada 14 minutos para evitar hibernação do Render
    setInterval(async () => {
        try {
            await axios.get(`${RENDER_URL}/ping`);
            console.log('Ping automático realizado: Sistema mantido acordado.');
        } catch (error) {
            console.error('Erro no ping automático:', error.message);
        }
    }, 14 * 60 * 1000); 
});

// === 2. BANCO DE DADOS FAKE (Fase de Testes) ===
const catalogo = {
    "skol 300ml": { precoCaixa: 65.00 },
    "heineken 600ml": { precoCaixa: 180.00 },
    "brahma duplo malte": { precoCaixa: 70.00 }
};

let vendasDoDia = []; 

// === 3. CONFIGURAÇÃO DO BOT DE WHATSAPP ===
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Caminho forçado apontando exatamente para onde o Render instalou o Chrome
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', (qr) => {
    console.log('=========================================');
    console.log('📱 ESCANEIE O QR CODE COM O WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('=========================================');
});

client.on('ready', () => {
    console.log('✅ Bot conectado ao WhatsApp e pronto para registrar vendas!');
});

client.on('message', async msg => {
    if (msg.author) return; // Ignora mensagens de grupos

    const texto = msg.body.toLowerCase();

    // Lógica provisória de teste 
    if (texto.includes('registre a venda')) {
        const produto = "skol 300ml"; // Fixo para teste
        const quantidade = 5;
        const valorTotal = catalogo[produto].precoCaixa * quantidade;

        vendasDoDia.push({
            produto,
            quantidade,
            valorTotal,
            hora: new Date().toLocaleTimeString('pt-BR')
        });

        await msg.reply(`✅ *Venda Registrada!*\n\nProduto: ${quantidade}cx de ${produto.toUpperCase()}\nValor: R$ ${valorTotal.toFixed(2)}`);
    }

    if (texto === 'relatorio' || texto === 'relatório') {
        if (vendasDoDia.length === 0) {
            return msg.reply('Nenhuma venda registrada hoje ainda.');
        }

        let relatorioTexto = '*📊 RELATÓRIO DE VENDAS:*\n\n';
        let faturamento = 0;

        vendasDoDia.forEach((venda, index) => {
            relatorioTexto += `${index + 1}. ${venda.quantidade}cx ${venda.produto} - R$ ${venda.valorTotal.toFixed(2)} (${venda.hora})\n`;
            faturamento += venda.valorTotal;
        });

        relatorioTexto += `\n*Faturamento Total:* R$ ${faturamento.toFixed(2)}`;
        await msg.reply(relatorioTexto);
    }
});

client.initialize();
