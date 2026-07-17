// ================================================================
// APP.JS - Lógica principal (SEM FIREBASE)
// ================================================================

// ================================================================
// ESTADO GLOBAL
// ================================================================

const estado = {
    carrinhoId: null,
    usuarioId: null,
    produtos: [],
    total: 0,
    contadorItens: 0,
    estaLogado: false,
    mercadoId: 'mercado_teste'
};

// ================================================================
// INICIALIZAÇÃO
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🛒 Smart Cart iniciado! (Sem Firebase)');
    console.log(`📦 Versão: ${CONFIG.VERSAO}`);
    
    // Mostra ajuda no console
    console.log('📋 Comandos disponíveis:');
    console.log('  verBancoDeDados() - Ver todos os dados');
    console.log('  limparBancoDeDados() - Limpar todos os dados');
    
    criarContainerNotificacoes();
    configurarEventos();
    
    // Inicializa produtos
    inicializarProdutos();
    
    // Verifica sessão
    const sessao = localStorage.getItem('sessaoCart');
    if (sessao) {
        try {
            const dados = JSON.parse(sessao);
            if (dados.carrinhoId) {
                estado.carrinhoId = dados.carrinhoId;
                estado.usuarioId = dados.usuarioId;
                estado.estaLogado = true;
                carregarCarrinho(estado.carrinhoId);
                mostrarTela('mainScreen');
                document.getElementById('userName').textContent = estado.usuarioId;
                document.getElementById('cartId').textContent = `Carrinho #${estado.carrinhoId.slice(-6)}`;
            }
        } catch (e) {
            console.error('Erro ao carregar sessão:', e);
        }
    }
});

// ================================================================
// CRIAÇÃO DE ELEMENTOS
// ================================================================

function criarContainerNotificacoes() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        width: 90%;
        max-width: 400px;
        pointer-events: none;
    `;
    container.addEventListener('click', (e) => {
        if (e.target.closest('button')) e.stopPropagation();
    });
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .notification { pointer-events: auto; cursor: default; }
        .notification button { cursor: pointer; }
    `;
    document.head.appendChild(style);
}

// ================================================================
// EVENTOS
// ================================================================

function configurarEventos() {
    // Login
    document.getElementById('btnOpenScanner')?.addEventListener('click', abrirScannerLogin);
    document.getElementById('btnManualCode')?.addEventListener('click', () => {
        const codigo = prompt('Digite o código do carrinho (ex: ABC123):');
        if (codigo && codigo.trim()) processarLogin(codigo.trim());
    });
    
    // Produtos
    document.getElementById('btnAddProduct')?.addEventListener('click', adicionarProdutoPorCodigo);
    document.getElementById('barcodeInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') adicionarProdutoPorCodigo();
    });
    document.getElementById('btnScanBarcode')?.addEventListener('click', abrirScannerBarras);
    
    // Pagamento
    document.getElementById('btnPix')?.addEventListener('click', iniciarPagamentoPIX);
    document.getElementById('btnNFC')?.addEventListener('click', iniciarPagamentoNFC);
    document.getElementById('btnFinish')?.addEventListener('click', finalizarCompra);
    document.getElementById('btnNFCConfirm')?.addEventListener('click', confirmarPagamentoNFC);
    document.getElementById('btnCopyPix')?.addEventListener('click', copiarChavePIX);
    document.getElementById('btnNewPurchase')?.addEventListener('click', novaCompra);
    document.getElementById('btnBackToCart')?.addEventListener('click', voltarParaCarrinho);
    
    // Debug - clique duplo no logo para abrir console
    document.querySelector('.logo')?.addEventListener('dblclick', () => {
        verBancoDeDados();
        console.log('💡 Dica: use limparBancoDeDados() para resetar');
    });
}

// ================================================================
// LOGIN
// ================================================================

async function abrirScannerLogin() {
    if (!BarcodeScanner.isCameraSupported()) {
        alert('Câmera não suportada. Use o código manual.');
        return;
    }
    
    const sucesso = await scanner.iniciarCamera(async (codigo) => {
        scanner.pararCamera();
        await processarLogin(codigo);
    });
    
    if (!sucesso) alert('Erro ao abrir a câmera.');
}

async function processarLogin(codigo) {
    // Qualquer código com 4+ caracteres é válido
    if (codigo && codigo.length >= 4) {
        estado.usuarioId = `cliente_${Date.now().toString().slice(-6)}`;
        estado.estaLogado = true;
        
        const carrinhoId = await criarCarrinho(estado.usuarioId, estado.mercadoId);
        estado.carrinhoId = carrinhoId;
        
        localStorage.setItem('sessaoCart', JSON.stringify({
            carrinhoId: carrinhoId,
            usuarioId: estado.usuarioId
        }));
        
        document.getElementById('userName').textContent = estado.usuarioId;
        document.getElementById('cartId').textContent = `Carrinho #${carrinhoId.slice(-6)}`;
        
        mostrarTela('mainScreen');
        securitySystem.resetar();
        atualizarStatusSeguranca();
        atualizarUI();
        
        mostrarNotificacao('🎉 Bem-vindo! Escaneie seus produtos.', 'success');
    } else {
        const errorEl = document.getElementById('loginError');
        errorEl.style.display = 'flex';
        errorEl.querySelector('span').textContent = 'Código inválido.';
        setTimeout(() => errorEl.style.display = 'none', 3000);
    }
}

// ================================================================
// PRODUTOS
// ================================================================

async function adicionarProdutoPorCodigo() {
    const input = document.getElementById('barcodeInput');
    const codigo = input.value.trim();
    
    if (!codigo) {
        mostrarNotificacao('Digite ou escaneie um código.', 'warning');
        return;
    }
    
    const produto = await buscarProduto(codigo);
    
    if (!produto) {
        mostrarNotificacao(`Produto "${codigo}" não encontrado.`, 'error');
        input.value = '';
        input.focus();
        return;
    }
    
    const resultado = escanearProdutoUI(produto);
    
    if (resultado.sucesso) {
        input.value = '';
        input.focus();
        input.style.borderColor = '#34a853';
        setTimeout(() => input.style.borderColor = '', 1000);
    }
}

// ================================================================
// CARRINHO
// ================================================================

async function carregarCarrinho(carrinhoId) {
    const dados = await buscarCarrinho(carrinhoId);
    
    if (!dados || !dados.produtos) {
        estado.produtos = [];
        estado.total = 0;
        estado.contadorItens = 0;
        atualizarUI();
        return;
    }
    
    const produtos = Object.values(dados.produtos);
    estado.produtos = produtos;
    estado.contadorItens = produtos.reduce((total, p) => total + (p.quantidade || 1), 0);
    estado.total = produtos.reduce((total, p) => total + (p.preco * (p.quantidade || 1)), 0);
    
    atualizarUI();
    atualizarStatusSeguranca();
}

function atualizarUI() {
    const list = document.getElementById('productList');
    const count = document.getElementById('itemCount');
    const subtotal = document.getElementById('subtotal');
    const total = document.getElementById('total');
    
    count.textContent = `${estado.contadorItens} itens`;
    subtotal.textContent = `R$ ${estado.total.toFixed(2)}`;
    total.textContent = `R$ ${estado.total.toFixed(2)}`;
    
    if (estado.produtos.length === 0) {
        list.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Carrinho vazio</p>
                <span style="font-size:12px;">Escaneie e confirme um produto</span>
            </div>
        `;
        return;
    }
    
    list.innerHTML = estado.produtos.map((p) => `
        <div class="product-item">
            <div class="info">
                <span class="name">${p.nome}</span>
                <span class="details">
                    <span>Qtd: ${p.quantidade || 1}</span>
                    <span>📷 ${p.barcode.slice(-6)}</span>
                </span>
            </div>
            <span class="price">R$ ${(p.preco * (p.quantidade || 1)).toFixed(2)}</span>
            <button class="remove-btn" onclick="removerProdutoUI('${p.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
}

async function removerProdutoUI(produtoId) {
    try {
        await removerDoCarrinho(estado.carrinhoId, produtoId);
        await carregarCarrinho(estado.carrinhoId);
        mostrarNotificacao('Produto removido.', 'warning');
    } catch (error) {
        mostrarNotificacao('Erro ao remover.', 'error');
    }
}

// ================================================================
// PAGAMENTO
// ================================================================

function finalizarCompra() {
    if (estado.produtos.length === 0) {
        mostrarNotificacao('Carrinho vazio!', 'warning');
        return;
    }
    
    const status = securitySystem.verificarSeguranca();
    if (!status.seguro) {
        mostrarNotificacao(`⚠️ ${status.pendentes} produto(s) aguardando confirmação!`, 'error');
        return;
    }
    
    const confirmar = confirm(
        `🛒 Finalizar compra?\n\n${estado.produtos.length} produtos\nTotal: R$ ${estado.total.toFixed(2)}`
    );
    
    if (!confirmar) return;
    
    const opcao = confirm('OK = PIX | Cancelar = NFC');
    if (opcao) iniciarPagamentoPIX();
    else iniciarPagamentoNFC();
}

function iniciarPagamentoPIX() {
    if (estado.produtos.length === 0 || !securitySystem.verificarSeguranca().seguro) {
        mostrarNotificacao('Confirme todos os produtos!', 'error');
        return;
    }
    abrirPagamentoPIX(estado.produtos, estado.total);
}

function iniciarPagamentoNFC() {
    if (estado.produtos.length === 0 || !securitySystem.verificarSeguranca().seguro) {
        mostrarNotificacao('Confirme todos os produtos!', 'error');
        return;
    }
    abrirPagamentoNFC(estado.produtos, estado.total);
}

function copiarChavePIX() {
    const chave = CONFIG.CHAVE_PIX || 'seu-email@exemplo.com';
    if (navigator.clipboard) {
        navigator.clipboard.writeText(chave).then(() => {
            mostrarNotificacao('Chave PIX copiada!', 'success');
        }).catch(() => prompt('Copie:', chave));
    } else {
        prompt('Copie:', chave);
    }
}

function novaCompra() {
    securitySystem.resetar();
    estado.produtos = [];
    estado.total = 0;
    estado.contadorItens = 0;
    
    mostrarTela('mainScreen');
    atualizarUI();
    atualizarStatusSeguranca();
    
    criarCarrinho(estado.usuarioId, estado.mercadoId).then(id => {
        estado.carrinhoId = id;
        document.getElementById('cartId').textContent = `Carrinho #${id.slice(-6)}`;
        localStorage.setItem('sessaoCart', JSON.stringify({
            carrinhoId: id,
            usuarioId: estado.usuarioId
        }));
    });
    
    mostrarNotificacao('🔄 Nova compra iniciada!', 'success');
}

function voltarParaCarrinho() {
    mostrarTela('mainScreen');
    atualizarUI();
    atualizarStatusSeguranca();
}

// ================================================================
// UTILITÁRIOS
// ================================================================

function mostrarTela(telaId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(telaId).classList.add('active');
}

// ================================================================
// EXPORTA FUNÇÕES PARA O CONSOLE (DEBUG)
// ================================================================

// Torna funções acessíveis no console para debug
window.verBancoDeDados = verBancoDeDados;
window.limparBancoDeDados = limparBancoDeDados;
window.DB = DB;

// ================================================================
// CÓDIGOS DE TESTE
// ================================================================

console.log('📋 Códigos de barras para teste:');
console.log('🍚 Arroz: 7891000100106');
console.log('🫘 Feijão: 7891000200103');
console.log('🥛 Leite: 7891000300102');
console.log('☕ Café: 7891000400101');
console.log('🍬 Açúcar: 7891000500100');
console.log('🫒 Óleo: 7891000600109');
console.log('🧼 Sabão: 7891000700108');
console.log('🧻 Papel: 7891000800107');
console.log('🍪 Biscoito: 7891000900106');
console.log('🥤 Refri: 7891001000105');
console.log('\n🔑 QR Code login: Qualquer código com 4+ caracteres (ex: ABC123)');