// ================================================================
// DATABASE.JS - Armazenamento Local (sem Firebase)
// ================================================================

// ================================================================
// BANCO DE DADOS LOCAL (LocalStorage)
// ================================================================

const DB = {
    /**
     * Obtém todos os dados de uma coleção
     */
    getCollection(name) {
        try {
            const data = localStorage.getItem(`smartcart_${name}`);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error(`Erro ao ler ${name}:`, error);
            return {};
        }
    },

    /**
     * Salva uma coleção inteira
     */
    setCollection(name, data) {
        try {
            localStorage.setItem(`smartcart_${name}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar ${name}:`, error);
            return false;
        }
    },

    /**
     * Adiciona um item a uma coleção
     */
    addItem(collection, item) {
        const data = this.getCollection(collection);
        const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        data[id] = { ...item, id, criadoEm: Date.now() };
        this.setCollection(collection, data);
        return id;
    },

    /**
     * Busca um item por ID
     */
    getItem(collection, id) {
        const data = this.getCollection(collection);
        return data[id] || null;
    },

    /**
     * Busca itens por campo
     */
    findItems(collection, field, value) {
        const data = this.getCollection(collection);
        const results = [];
        
        for (const [id, item] of Object.entries(data)) {
            if (item[field] === value) {
                results.push({ ...item, id });
            }
        }
        return results;
    },

    /**
     * Atualiza um item
     */
    updateItem(collection, id, updates) {
        const data = this.getCollection(collection);
        if (!data[id]) return false;
        
        data[id] = { ...data[id], ...updates, atualizadoEm: Date.now() };
        this.setCollection(collection, data);
        return true;
    },

    /**
     * Remove um item
     */
    removeItem(collection, id) {
        const data = this.getCollection(collection);
        if (!data[id]) return false;
        
        delete data[id];
        this.setCollection(collection, data);
        return true;
    },

    /**
     * Lista todos os itens de uma coleção
     */
    listItems(collection) {
        const data = this.getCollection(collection);
        return Object.entries(data).map(([id, item]) => ({ ...item, id }));
    },

    /**
     * Limpa uma coleção
     */
    clearCollection(collection) {
        this.setCollection(collection, {});
    },

    /**
     * Limpa todos os dados
     */
    clearAll() {
        const keys = Object.keys(localStorage);
        keys.filter(k => k.startsWith('smartcart_')).forEach(k => {
            localStorage.removeItem(k);
        });
    }
};

// ================================================================
// OPERAÇÕES DE PRODUTOS
// ================================================================

/**
 * Busca um produto pelo código de barras
 */
async function buscarProduto(barcode) {
    inicializarProdutos();
    const produtos = DB.findItems('produtos', 'barcode', barcode);
    return produtos.length > 0 ? produtos[0] : null;
}

/**
 * Lista todos os produtos
 */
async function listarProdutos() {
    inicializarProdutos();
    return DB.listItems('produtos');
}

/**
 * Adiciona um produto
 */
async function adicionarProduto(produto) {
    const id = DB.addItem('produtos', produto);
    return id;
}

/**
 * Atualiza um produto
 */
async function atualizarProduto(id, updates) {
    return DB.updateItem('produtos', id, updates);
}

/**
 * Remove um produto
 */
async function removerProduto(id) {
    return DB.removeItem('produtos', id);
}

// ================================================================
// OPERAÇÕES DE CARRINHO
// ================================================================

/**
 * Cria um novo carrinho
 */
async function criarCarrinho(usuarioId, mercadoId) {
    const carrinho = {
        usuarioId,
        mercadoId,
        produtos: {},
        status: 'ativo',
        criadoEm: Date.now(),
        atualizadoEm: Date.now()
    };
    
    const id = DB.addItem('carrinhos', carrinho);
    return id;
}

/**
 * Busca um carrinho
 */
async function buscarCarrinho(carrinhoId) {
    return DB.getItem('carrinhos', carrinhoId);
}

/**
 * Adiciona produto ao carrinho
 */
async function adicionarAoCarrinho(carrinhoId, produto, quantidade = 1) {
    const carrinho = await buscarCarrinho(carrinhoId);
    if (!carrinho) return false;
    
    const produtos = carrinho.produtos || {};
    const produtoId = produto.id || `prod_${Date.now()}`;
    
    if (produtos[produtoId]) {
        produtos[produtoId].quantidade += quantidade;
        produtos[produtoId].atualizadoEm = Date.now();
    } else {
        produtos[produtoId] = {
            ...produto,
            quantidade,
            adicionadoEm: Date.now()
        };
    }
    
    carrinho.produtos = produtos;
    carrinho.atualizadoEm = Date.now();
    
    return DB.updateItem('carrinhos', carrinhoId, carrinho);
}

/**
 * Remove produto do carrinho
 */
async function removerDoCarrinho(carrinhoId, produtoId) {
    const carrinho = await buscarCarrinho(carrinhoId);
    if (!carrinho) return false;
    
    const produtos = carrinho.produtos || {};
    delete produtos[produtoId];
    
    carrinho.produtos = produtos;
    carrinho.atualizadoEm = Date.now();
    
    return DB.updateItem('carrinhos', carrinhoId, carrinho);
}

/**
 * Lista carrinhos ativos
 */
async function listarCarrinhosAtivos() {
    const carrinhos = DB.listItems('carrinhos');
    return carrinhos.filter(c => c.status === 'ativo');
}

// ================================================================
// OPERAÇÕES DE PEDIDOS
// ================================================================

/**
 * Salva um pedido finalizado
 */
async function salvarPedido(pedido) {
    const id = DB.addItem('pedidos', {
        ...pedido,
        data: Date.now(),
        status: 'finalizado'
    });
    return id;
}

/**
 * Busca pedidos de um usuário
 */
async function buscarPedidosUsuario(usuarioId) {
    return DB.findItems('pedidos', 'usuarioId', usuarioId);
}

/**
 * Lista todos os pedidos
 */
async function listarPedidos() {
    return DB.listItems('pedidos');
}

// ================================================================
// INICIALIZAÇÃO DE PRODUTOS DEMO
// ================================================================

function inicializarProdutos() {
    const produtos = DB.listItems('produtos');
    
    if (produtos.length === 0) {
        const produtosDemo = [
            { nome: 'Arroz 5kg', barcode: '7891000100106', preco: 22.90, peso: 5000 },
            { nome: 'Feijão 1kg', barcode: '7891000200103', preco: 8.90, peso: 1000 },
            { nome: 'Leite 1L', barcode: '7891000300102', preco: 4.50, peso: 1000 },
            { nome: 'Café 500g', barcode: '7891000400101', preco: 12.90, peso: 500 },
            { nome: 'Açúcar 1kg', barcode: '7891000500100', preco: 6.90, peso: 1000 },
            { nome: 'Óleo 900ml', barcode: '7891000600109', preco: 9.90, peso: 900 },
            { nome: 'Sabão 1kg', barcode: '7891000700108', preco: 11.90, peso: 1000 },
            { nome: 'Papel 4x', barcode: '7891000800107', preco: 7.90, peso: 400 },
            { nome: 'Biscoito 200g', barcode: '7891000900106', preco: 3.50, peso: 200 },
            { nome: 'Refrigerante 2L', barcode: '7891001000105', preco: 8.50, peso: 2000 },
            { nome: 'Macarrão 500g', barcode: '7891001100104', preco: 5.90, peso: 500 },
            { nome: 'Molho 340g', barcode: '7891001200103', preco: 4.90, peso: 340 }
        ];
        
        for (const p of produtosDemo) {
            DB.addItem('produtos', p);
        }
        console.log('✅ Produtos demo carregados no LocalStorage!');
    }
}

// ================================================================
// FUNÇÕES DE UTILIDADE PARA DEBUG
// ================================================================

function verBancoDeDados() {
    console.log('📊 BANCO DE DADOS LOCAL:');
    console.log('Produtos:', DB.listItems('produtos'));
    console.log('Carrinhos:', DB.listItems('carrinhos'));
    console.log('Pedidos:', DB.listItems('pedidos'));
}

function limparBancoDeDados() {
    if (confirm('Limpar todos os dados?')) {
        DB.clearAll();
        console.log('🗑️ Banco de dados limpo!');
        location.reload
