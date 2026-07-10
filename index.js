const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const express = require('express');
const axios = require('axios');

// === 1. CONFIGURAÇÃO DO SERVIDOR WEB E PING (RENDER) ===
const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

let qrCodeImage = '';
let statusDoBot = 'Iniciando sistema, aguarde...';

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Conteiner Beer - Assistente</title>
                <meta charset="utf-8">
                <meta http-equiv="refresh" content="5"> 
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #121214; color: #fff; }
                    .card { background: #202024; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: inline-block; border: 1px solid #323238; }
                    h1 { color: #F7B731; }
                    .status { font-weight: bold; font-size: 18px; margin-bottom: 20px; color: #00B8D9; }
                    .success { color: #00D084; }
                    img { border-radius: 10px; border: 5px solid #fff; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Assistente - Conteiner Beer 🍻</h1>
                    <p class="status ${statusDoBot === '✅ Bot conectado e pronto!' ? 'success' : ''}">${statusDoBot}</p>
                    ${qrCodeImage ? `<img src="${qrCodeImage}" alt="QR Code do WhatsApp" style="width: 250px; height: 250px;" />` : ''}
                    <p style="font-size: 14px; color: #8D8D99; margin-top: 20px;">A página atualiza automaticamente.</p>
                </div>
            </body>
        </html>
    `);
});

app.get('/ping', (req, res) => res.send('pong'));

app.listen(PORT, () => {
    console.log(`Servidor web rodando na porta ${PORT}`);
    setInterval(async () => {
        try {
            await axios.get(`${RENDER_URL}/ping`);
            console.log('Ping automático realizado.');
        } catch (error) {
            console.error('Erro no ping:', error.message);
        }
    }, 14 * 60 * 1000); 
});

// === 2. BANCO DE DADOS FAKE ===
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
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <-- MÁGICA AQUI: Economiza muita memória RAM
            '--disable-gpu'
        ]
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

client.on('qr', async (qr) => {
    console.log('QR Code gerado! Atualize o site para ver.');
    statusDoBot = '⚠️ Escaneie o QR Code abaixo com o WhatsApp do Conteiner:';
    try {
        qrCodeImage = await qrcode.toDataURL(qr); 
    } catch (err) {
        console.error('Erro ao gerar imagem:', err);
    }
    qrcodeTerminal.generate(qr, { small: true }); 
});

client.on('ready', () => {
    console.log('✅ Bot conectado ao WhatsApp!');
    statusDoBot = '✅ Bot conectado e pronto!';
    qrCodeImage = ''; 
});

client.on('message', async msg => {
    if (msg.author) return; 

    const texto = msg.body.toLowerCase();

    if (texto.includes('registre a venda')) {
        const produto = "skol 300ml"; 
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
