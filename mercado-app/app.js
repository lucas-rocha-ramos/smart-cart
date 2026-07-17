// ================================================================
// APP.JS - Lógica principal (SEM BALANÇA)
// ================================================================

// ================================================================
// ESTADO GLOBAL
// ================================================================

const estado = {
    carrinhoId: null,
    usuarioId: null,
    produtos: [],
    produtosConfirmados: [],
    total: 0,
    contadorItens: 0,
    estaLogado: false,
    mercadoId: 'mercado_teste',
    etapa: 'login' // login | comprando | pagamento
};

// ================================================================
// INICIALIZAÇÃO
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🛒 Smart Cart iniciado (sem balança)');
    
    configurarEventos();
    
    // Adiciona container para notificações
    criarContainerNotificacoes();
    
    // Adiciona container para produtos pendentes
    criarContainerPendentes();
    
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
            }
        } catch (e) {
            console.error('Erro ao carregar sessão:', e);
        }
    }
});

// ================================================================
// CRIAÇÃO DE ELEMENTOS DA UI
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
        // Permite clique nos botões de fechar
        if (e.target.closest('button')) {
            e.stopPropagation();
        }
    });
    document.body.appendChild(container);

    // Estilo para animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .notification {
            pointer-events: auto;
            cursor: default;
        }
        .notification button {
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
}

function criarContainerPendentes() {
    const mainScreen = document.getElementById('mainScreen');
    if (!mainScreen) return;

    const container = document.createElement('div');
    container.id = 'pendingContainer';
    container.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 12px 16px;
        margin: 8px 0 12px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    `;
    container.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:#5f6368;">
            <i class="fas fa-hourglass-half"></i>
            <span>Aguardando confirmação:</span>
            <span id="pendingCount" style="font-weight:600;color:#1a73e8;">0</span>
        </div>
        <div id="pendingProducts"></div>
    `;
    
    // Insere após a barra de segurança
    const securityBar = document.getElementById('securityStatus');
    if (securityBar && securityBar.parentNode) {
        securityBar.parentNode.insertBefore(container, securityBar.nextSibling);
    }
}

// ================================================================
// EVENTOS DA UI
// ================================================================

function configurarEventos() {
    // ---- TELA DE LOGIN ----
    document.getElementById('btnOpenScanner')?.addEventListener('click', abrirScannerLogin);
    document.getElementById('btnManualCode')?.addEventListener('click', () => {
        const codigo = prompt('Digite o código do carrinho (ex: ABC123):');
        if (codigo && codigo.trim()) processarLogin(codigo.trim());
    });
    
    // ---- SCANNER ----
    document.getElementById('btnAddProduct')?.addEventListener('click', adicionarProdutoPorCodigo);
    document.getElementById('barcodeInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') adicionarProdutoPorCodigo();
    });
    document.getElementById('btnScanBarcode')?.addEventListener('click', abrirScannerBarras);
    
    // ---- PAGAMENTO ----
    document.getElementById('btnPix')?.addEventListener('click', iniciarPagamentoPIX);
    document.getElementById('btnNFC')?.addEventListener('click', iniciarPagamentoNFC);
    document.getElementById('btnFinish')?.addEventListener('click', finalizarCompra);
    document.getElementById('btnNFCConfirm')?.addEventListener('click', confirmarPagamentoNFC);
    document.getElementById('btnCopyPix')?.addEventListener('click', copiarChavePIX);
    document.getElementById('btnNewPurchase')?.addEventListener('click', novaCompra);
    document.getElementById('btnBackToCart')?.addEventListener('click', voltarParaCarrinho);
}

// ================================================================
// FUNÇÕES DE LOGIN
// ================================================================

async function abrirScannerLogin() {
    if (!BarcodeScanner.isCameraSupported()) {
        alert('Câmera não suportada. Use o código manual.');
        return;
    }
    
    const sucesso = await scanner.iniciarCamera(
        async (codigo) => {
            scanner.pararCamera();
            await processarLogin(codigo);
        }
    );
    
    if (!sucesso) {
        alert('Erro ao abrir a câmera. Tente o código manual.');
    }
}

async function processarLogin(codigo) {
    // Validação simples
    if (codigo && codigo.length >= 4) {
        estado.usuarioId = `cliente_${Date.now().toString().slice(-6)}`;
        estado.estaLogado = true;
        
        // Cria um novo carrinho
        const carrinhoId = await criarCarrinho(estado.usuarioId, estado.mercadoId);
        estado.carrinhoId = carrinhoId;
        
        // Salva na sessão
        localStorage.setItem('sessaoCart', JSON.stringify({
            carrinhoId: carrinhoId,
            usuarioId: estado.usuarioId
        }));
        
        // Carrega a tela principal
        document.getElementById('userName').textContent = estado.usuarioId;
        document.getElementById('cartId').textContent = `Carrinho #${carrinhoId.slice(-6)}`;
        
        mostrarTela('mainScreen');
        
        // Carrega produtos demo
        await carregarProdutosDemo();
        
        // Reseta o sistema de segurança
        securitySystem.resetar();
        atualizarStatusSeguranca();
        
        mostrarNotificacao('🎉 Bem-vindo! Escaneie seus produtos.', 'success');
    } else {
        const errorEl = document.getElementById('loginError');
        errorEl.style.display = 'flex';
        errorEl.querySelector('span').textContent = 'Código inválido. Tente novamente.';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 3000);
    }
}

// ================================================================
// FUNÇÕES DE PRODUTOS
// ================================================================

async function adicionarProdutoPorCodigo() {
    const input = document.getElementById('barcodeInput');
    const codigo = input.value.trim();
    
    if (!codigo) {
        mostrarNotificacao('Digite ou escaneie um código de barras.', 'warning');
        return;
    }
    
    // Busca o produto no banco
    const produto = await buscarProduto(codigo);
    
    if (!produto) {
        mostrarNotificacao(`Produto "${codigo}" não encontrado.`, 'error');
        input.value = '';
        input.focus();
        return;
    }
    
    // Verifica se já está no carrinho final
    const jaNoCarrinho = estado.produtos.some(p => p.barcode === codigo);
    if (jaNoCarrinho) {
        mostrarNotificacao(`"${produto.nome}" já está no carrinho.`, 'warning');
        input.value = '';
        input.focus();
        return;
    }
    
    // Sistema de segurança: escaneia e aguarda confirmação
    const resultado = escanearProdutoUI(produto);
    
    if (resultado.sucesso) {
        input.value = '';
        input.focus();
        
        // Adiciona feedback visual no input
        input.style.borderColor = '#34a853';
        setTimeout(() => {
            input.style.borderColor = '';
        }, 1000);
    }
}

// ================================================================
// FUNÇÕES DE CARRINHO
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
    
    // Atualiza contador
    count.textContent = `${estado.contadorItens} itens`;
    
    // Atualiza valores
    subtotal.textContent = `R$ ${estado.total.toFixed(2)}`;
    total.textContent = `R$ ${estado.total.toFixed(2)}`;
    
    // Atualiza lista
    if (estado.produtos.length === 0) {
        list.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Carrinho vazio</p>
                <span style="font-size:12px;">Escaneie e confirme um produto para começar</span>
            </div>
        `;
        return;
    }
    
    list.innerHTML = estado.produtos.map((p, index) => `
        <div class="product-item">
            <div class="info">
                <span class="name">${p.nome}</span>
                <span class="details">
                    <span>Qtd: ${p.quantidade || 1}</span>
                    <span>${p.barcode ? '📷 ' + p.barcode.slice(-6) : ''}</span>
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
        // Remove do carrinho no Firebase
        await removerDoCarrinho(estado.carrinhoId, produtoId);
        
        // Remove também do sistema de segurança se estiver lá
        const produto = estado.produtos.find(p => p.id === produtoId);
        if (produto) {
            cancelarProdutoUI(produto.barcode);
        }
        
        // Recarrega
        await carregarCarrinho(estado.carrinhoId);
        mostrarNotificacao('Produto removido.', 'warning');
    } catch (error) {
        mostrarNotificacao('Erro ao remover produto.', 'error');
    }
}

// ================================================================
// FUNÇÕES DE PAGAMENTO
// ================================================================

function finalizarCompra() {
    // Verifica se há produtos
    if (estado.produtos.length === 0) {
        mostrarNotificacao('Carrinho vazio! Adicione produtos.', 'warning');
        return;
    }
    
    // Verifica se o sistema de segurança está ok
    const status = securitySystem.verificarSeguranca();
    if (!status.seguro) {
        mostrarNotificacao(
            `⚠️ ${status.pendentes} produto(s) aguardando confirmação!`,
            'error'
        );
        return;
    }
    
    // Confirmação final
    const total = estado.total.toFixed(2);
    const confirmar = confirm(
        `🛒 Finalizar compra?\n\n` +
        `${estado.produtos.length} produtos\n` +
        `Total: R$ ${total}\n\n` +
        `Deseja prosseguir para o pagamento?`
    );
    
    if (!confirmar) return;
    
    // Abre opções de pagamento
    const opcao = confirm(
        '💰 Como deseja pagar?\n\n' +
        'OK = PIX\n' +
        'Cancelar = NFC/Aproximação'
    );
    
    if (opcao) {
        iniciarPagamentoPIX();
    } else {
        iniciarPagamentoNFC();
    }
}

function iniciarPagamentoPIX() {
    if (estado.produtos.length === 0) {
        mostrarNotificacao('Carrinho vazio!', 'warning');
        return;
    }
    
    const status = securitySystem.verificarSeguranca();
    if (!status.seguro) {
        mostrarNotificacao('Confirme todos os produtos primeiro!', 'error');
        return;
    }
    
    abrirPagamentoPIX(estado.produtos, estado.total);
}

function iniciarPagamentoNFC() {
    if (estado.produtos.length === 0) {
        mostrarNotificacao('Carrinho vazio!', 'warning');
        return;
    }
    
    const status = securitySystem.verificarSeguranca();
    if (!status.seguro) {
        mostrarNotificacao('Confirme todos os produtos primeiro!', 'error');
        return;
    }
    
    abrirPagamentoNFC(estado.produtos, estado.total);
}

function copiarChavePIX() {
    const chave = CONFIG.CHAVE_PIX || 'seu-email@exemplo.com';
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(chave).then(() => {
            mostrarNotificacao('Chave PIX copiada!', 'success');
        }).catch(() => {
            prompt('Copie a chave PIX manualmente:', chave);
        });
    } else {
        prompt('Copie a chave PIX manualmente:', chave);
    }
}

function novaCompra() {
    // Reseta tudo
    securitySystem.resetar();
    estado.produtos = [];
    estado.total = 0;
    estado.contadorItens = 0;
    
    // Volta para a tela principal
    mostrarTela('mainScreen');
    atualizarUI();
    atualizarStatusSeguranca();
    
    // Cria um novo carrinho
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
// FUNÇÃO PARA MOSTRAR TELAS
// ================================================================

function mostrarTela(telaId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const tela = document.getElementById(telaId);
    if (tela) tela.classList.add('active');
}

// ================================================================
// CÓDIGOS DE BARRAS PARA TESTE
// ================================================================

console.log('📋 Códigos de barras para teste (SEM BALANÇA):');
console.log('🍚 Arroz 5kg: 7891000100106');
console.log('🫘 Feijão 1kg: 7891000200103');
console.log('🥛 Leite 1L: 7891000300102');
console.log('☕ Café 500g: 7891000400101');
console.log('🍬 Açúcar 1kg: 7891000500100');
console.log('🫒 Óleo 900ml: 7891000600109');
console.log('🧼 Sabão 1kg: 7891000700108');
console.log('🧻 Papel 4x: 7891000800107');
console.log('🍪 Biscoito 200g: 7891000900106');
console.log('🥤 Refri 2L: 7891001000105');
console.log('\n🔑 QR Code para login: ABC123');