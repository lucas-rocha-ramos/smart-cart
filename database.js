// ================================================================
// DATABASE.JS - Armazenamento Local (com imagens dos produtos)
// ================================================================

// ================================================================
// BANCO DE DADOS LOCAL (LocalStorage)
// ================================================================

const DB = {
    getCollection(name) {
        try {
            const data = localStorage.getItem(`smartcart_${name}`);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error(`Erro ao ler ${name}:`, error);
            return {};
        }
    },

    setCollection(name, data) {
        try {
            localStorage.setItem(`smartcart_${name}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar ${name}:`, error);
            return false;
        }
    },

    addItem(collection, item) {
        const data = this.getCollection(collection);
        const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        data[id] = { ...item, id, criadoEm: Date.now() };
        this.setCollection(collection, data);
        return id;
    },

    getItem(collection, id) {
        const data = this.getCollection(collection);
        return data[id] || null;
    },

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

    updateItem(collection, id, updates) {
        const data = this.getCollection(collection);
        if (!data[id]) return false;
        data[id] = { ...data[id], ...updates, atualizadoEm: Date.now() };
        this.setCollection(collection, data);
        return true;
    },

    removeItem(collection, id) {
        const data = this.getCollection(collection);
        if (!data[id]) return false;
        delete data[id];
        this.setCollection(collection, data);
        return true;
    },

    listItems(collection) {
        const data = this.getCollection(collection);
        return Object.entries(data).map(([id, item]) => ({ ...item, id }));
    },

    clearCollection(collection) {
        this.setCollection(collection, {});
    },

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

async function buscarProduto(barcode) {
    inicializarProdutos();
    const produtos = DB.findItems('produtos', 'barcode', barcode);
    if (produtos.length > 0) {
        console.log(`✅ Produto encontrado: ${produtos[0].nome}`);
        return produtos[0];
    }
    console.log(`❌ Produto com código ${barcode} não encontrado.`);
    return null;
}

async function listarProdutos() {
    inicializarProdutos();
    return DB.listItems('produtos');
}

async function adicionarProduto(produto) {
    const id = DB.addItem('produtos', produto);
    return id;
}

async function atualizarProduto(id, updates) {
    return DB.updateItem('produtos', id, updates);
}

async function removerProduto(id) {
    return DB.removeItem('produtos', id);
}

// ================================================================
// OPERAÇÕES DE CARRINHO
// ================================================================

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

async function buscarCarrinho(carrinhoId) {
    return DB.getItem('carrinhos', carrinhoId);
}

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

async function removerDoCarrinho(carrinhoId, produtoId) {
    const carrinho = await buscarCarrinho(carrinhoId);
    if (!carrinho) return false;
    const produtos = carrinho.produtos || {};
    delete produtos[produtoId];
    carrinho.produtos = produtos;
    carrinho.atualizadoEm = Date.now();
    return DB.updateItem('carrinhos', carrinhoId, carrinho);
}

async function listarCarrinhosAtivos() {
    const carrinhos = DB.listItems('carrinhos');
    return carrinhos.filter(c => c.status === 'ativo');
}

// ================================================================
// OPERAÇÕES DE PEDIDOS
// ================================================================

async function salvarPedido(pedido) {
    const id = DB.addItem('pedidos', {
        ...pedido,
        data: Date.now(),
        status: 'finalizado'
    });
    return id;
}

async function buscarPedidosUsuario(usuarioId) {
    return DB.findItems('pedidos', 'usuarioId', usuarioId);
}

async function listarPedidos() {
    return DB.listItems('pedidos');
}

// ================================================================
// INICIALIZAÇÃO DE PRODUTOS DEMO COM IMAGENS
// ================================================================

function inicializarProdutos() {
    const produtos = DB.listItems('produtos');
    
    if (produtos.length === 0) {
        const produtosDemo = [
            { 
                nome: 'Arroz 5kg', 
                barcode: '7891000100106', 
                preco: 22.90, 
                peso: 5000,
                imagem: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&h=100&fit=crop&auto=format',
                emoji: '🍚'
            },
            { 
                nome: 'Feijão 1kg', 
                barcode: '7891000200103', 
                preco: 8.90, 
                peso: 1000,
                imagem: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&h=100&fit=crop&auto=format',
                emoji: '🫘'
            },
            { 
                nome: 'Leite 1L', 
                barcode: '7891000300102', 
                preco: 4.50, 
                peso: 1000,
                imagem: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop&auto=format',
                emoji: '🥛'
            },
            { 
                nome: 'Café 500g', 
                barcode: '7891000400101', 
                preco: 12.90, 
                peso: 500,
                imagem: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100&h=100&fit=crop&auto=format',
                emoji: '☕'
            },
            { 
                nome: 'Açúcar 1kg', 
                barcode: '7891000500100', 
                preco: 6.90, 
                peso: 1000,
                imagem: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&h=100&fit=crop&auto=format',
                emoji: '🍬'
            },
            { 
                nome: 'Óleo 900ml', 
                barcode: '7891000600109', 
                preco: 9.90, 
                peso: 900,
                imagem: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100&h=100&fit=crop&auto=format',
                emoji: '🫒'
            },
            { 
                nome: 'Sabão 1kg', 
                barcode: '7891000700108', 
                preco: 11.90, 
                peso: 1000,
                imagem: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&h=100&fit=crop&auto=format',
                emoji: '🧼'
            },
            { 
                nome: 'Papel 4x', 
                barcode: '7891000800107', 
                preco: 7.90, 
                peso: 400,
                imagem: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&h=100&fit=crop&auto=format',
                emoji: '🧻'
            },
            { 
                nome: 'Biscoito 200g', 
                barcode: '7891000900106', 
                preco: 3.50, 
                peso: 200,
                imagem: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=100&h=100&fit=crop&auto=format',
                emoji: '🍪'
            },
            { 
                nome: 'Refrigerante 2L', 
                barcode: '7891001000105', 
                preco: 8.50, 
                peso: 2000,
                imagem: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=100&h=100&fit=crop&auto=format',
                emoji: '🥤'
            },
            { 
                nome: 'Palito de dente GINA 200 un', 
                barcode: '7896051020158', 
                preco: 2.50, 
                peso: 50,
                imagem: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&h=100&fit=crop&auto=format',
                emoji: '🪥'
            }
        ];
        
        for (const p of produtosDemo) {
            DB.addItem('produtos', p);
        }
        console.log('✅ Produtos demo carregados com imagens!');
        console.log('📋 Total:', produtosDemo.length, 'produtos');
    }
}

// ================================================================
// FUNÇÕES DE UTILIDADE PARA DEBUG
// ================================================================

function verBancoDeDados() {
    console.log('📊 BANCO DE DADOS LOCAL:');
    console.log('📦 Produtos:', DB.listItems('produtos').length, 'itens');
    console.log('🛒 Carrinhos:', DB.listItems('carrinhos').length, 'itens');
    console.log('📋 Pedidos:', DB.listItems('pedidos').length, 'itens');
    console.log('\n📦 Produtos:', DB.listItems('produtos'));
}

function limparBancoDeDados() {
    if (confirm('Limpar todos os dados?')) {
        DB.clearAll();
        console.log('🗑️ Banco de dados limpo!');
        location.reload();
    }
}

function listarCodigosBarras() {
    const produtos = DB.listItems('produtos');
    console.log('📋 CÓDIGOS DE BARRAS DISPONÍVEIS:');
    produtos.forEach(p => {
        console.log(`  ${p.barcode} - ${p.nome} - R$ ${p.preco.toFixed(2)}`);
    });
}

// ================================================================
// EXPORTAR FUNÇÕES
// ================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DB,
        buscarProduto,
        listarProdutos,
        adicionarProduto,
        atualizarProduto,
        removerProduto,
        criarCarrinho,
        buscarCarrinho,
        adicionarAoCarrinho,
        removerDoCarrinho,
        listarCarrinhosAtivos,
        salvarPedido,
        buscarPedidosUsuario,
        listarPedidos,
        verBancoDeDados,
        limparBancoDeDados,
        listarCodigosBarras
    };
}
