// ================================================================
// SECURITY.JS - Sistema de segurança SEM BALANÇA
// ================================================================

class SecuritySystem {
    constructor() {
        this.produtosEscaneados = [];
        this.produtosConfirmados = [];
        this.tempoLimite = CONFIG.TEMPO_CONFIRMACAO || 5000;
        this.timers = {};
        this.isLocked = false;
        this.alertaAtivo = false;
        this.ultimoProdutoEscaneado = null;
        this.onTimeout = null;
    }

    /**
     * Registra um produto escaneado
     */
    escanearProduto(produto) {
        // Verifica se já foi escaneado
        const jaEscaneado = this.produtosEscaneados.some(
            p => p.barcode === produto.barcode && !p.confirmado
        );

        if (jaEscaneado) {
            return {
                sucesso: false,
                erro: 'produto_ja_escaneado',
                mensagem: `"${produto.nome}" já foi escaneado.`
            };
        }

        // Verifica se já está no carrinho final
        const jaConfirmado = this.produtosConfirmados.some(
            p => p.barcode === produto.barcode
        );

        if (jaConfirmado) {
            return {
                sucesso: false,
                erro: 'produto_ja_confirmado',
                mensagem: `"${produto.nome}" já está no carrinho.`
            };
        }

        // Adiciona à lista de pendentes
        const produtoComStatus = {
            ...produto,
            escaneadoEm: Date.now(),
            confirmado: false,
            tempoLimite: this.tempoLimite
        };

        this.produtosEscaneados.push(produtoComStatus);
        this.ultimoProdutoEscaneado = produtoComStatus;
        this.alertaAtivo = false;
        this.isLocked = false;

        // Inicia timer
        this.iniciarTimer(produto.barcode);

        return {
            sucesso: true,
            mensagem: `"${produto.nome}" escaneado! Confirme em ${this.tempoLimite/1000}s.`,
            produto: produtoComStatus
        };
    }

    /**
     * Confirma que o produto foi colocado no carrinho
     */
    confirmarProduto(barcode) {
        const index = this.produtosEscaneados.findIndex(
            p => p.barcode === barcode && !p.confirmado
        );

        if (index === -1) {
            return {
                sucesso: false,
                erro: 'produto_nao_escaneado',
                mensagem: 'Produto não encontrado na lista de escaneados.'
            };
        }

        const produto = this.produtosEscaneados[index];
        this.cancelarTimer(barcode);
        
        produto.confirmado = true;
        produto.confirmadoEm = Date.now();
        
        this.produtosConfirmados.push(produto);
        this.produtosEscaneados.splice(index, 1);
        
        this.alertaAtivo = false;

        return {
            sucesso: true,
            mensagem: `"${produto.nome}" confirmado! ✓`,
            produto: produto
        };
    }

    /**
     * Cancela um produto escaneado
     */
    cancelarProduto(barcode) {
        const index = this.produtosEscaneados.findIndex(
            p => p.barcode === barcode && !p.confirmado
        );

        if (index === -1) {
            return {
                sucesso: false,
                erro: 'produto_nao_encontrado',
                mensagem: 'Produto não encontrado.'
            };
        }

        const produto = this.produtosEscaneados[index];
        this.cancelarTimer(barcode);
        this.produtosEscaneados.splice(index, 1);
        
        return {
            sucesso: true,
            mensagem: `"${produto.nome}" removido.`,
            produto: produto
        };
    }

    /**
     * Inicia timer de confirmação
     */
    iniciarTimer(barcode) {
        this.cancelarTimer(barcode);

        this.timers[barcode] = setTimeout(() => {
            const index = this.produtosEscaneados.findIndex(
                p => p.barcode === barcode && !p.confirmado
            );
            
            if (index !== -1) {
                const produto = this.produtosEscaneados[index];
                this.produtosEscaneados.splice(index, 1);
                this.alertaAtivo = true;
                this.isLocked = true;
                
                if (typeof this.onTimeout === 'function') {
                    this.onTimeout(produto);
                }
            }
            
            delete this.timers[barcode];
        }, this.tempoLimite);
    }

    /**
     * Cancela timer
     */
    cancelarTimer(barcode) {
        if (this.timers[barcode]) {
            clearTimeout(this.timers[barcode]);
            delete this.timers[barcode];
        }
    }

    /**
     * Verifica segurança do sistema
     */
    verificarSeguranca() {
        const pendentes = this.produtosEscaneados.length;
        const confirmados = this.produtosConfirmados.length;

        return {
            seguro: pendentes === 0 && !this.isLocked,
            pendentes: pendentes,
            confirmados: confirmados,
            total: pendentes + confirmados,
            alerta: this.alertaAtivo || this.isLocked || pendentes > 0,
            mensagem: pendentes === 0 
                ? '✅ Todos os produtos confirmados!' 
                : `⏳ ${pendentes} produto(s) aguardando confirmação`,
            detalhes: {
                escaneadosPendentes: this.produtosEscaneados,
                confirmados: this.produtosConfirmados
            }
        };
    }

    /**
     * Obtém produtos confirmados
     */
    getProdutosConfirmados() {
        return this.produtosConfirmados;
    }

    /**
     * Reseta o sistema
     */
    resetar() {
        Object.keys(this.timers).forEach(key => {
            clearTimeout(this.timers[key]);
            delete this.timers[key];
        });
        
        this.produtosEscaneados = [];
        this.produtosConfirmados = [];
        this.isLocked = false;
        this.alertaAtivo = false;
        this.ultimoProdutoEscaneado = null;
    }

    /**
     * Define callback para timeout
     */
    setOnTimeout(callback) {
        this.onTimeout = callback;
    }
}

// ================================================================
// INSTÂNCIA GLOBAL
// ================================================================

const securitySystem = new SecuritySystem();

// ================================================================
// FUNÇÕES DE INTEGRAÇÃO COM A UI
// ================================================================

function atualizarStatusSeguranca() {
    const status = securitySystem.verificarSeguranca();
    const bar = document.getElementById('securityStatus');
    
    if (!bar) return;
    
    if (status.seguro) {
        bar.className = 'security-bar safe';
        bar.innerHTML = `<i class="fas fa-check-circle"></i> ${status.mensagem}`;
    } else if (status.pendentes > 0) {
        bar.className = 'security-bar warning';
        bar.innerHTML = `<i class="fas fa-clock"></i> ${status.mensagem}`;
    } else if (status.alerta) {
        bar.className = 'security-bar danger';
        bar.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${status.mensagem}`;
    }

    // Atualiza contador de pendentes
    const count = document.getElementById('pendingCount');
    if (count) count.textContent = status.pendentes;

    // Atualiza lista de pendentes
    atualizarProdutosPendentes(status.detalhes?.escaneadosPendentes || []);
}

function atualizarProdutosPendentes(pendentes) {
    const container = document.getElementById('pendingProducts');
    if (!container) return;

    if (pendentes.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#5f6368; padding:8px; font-size:13px;">
                Nenhum produto aguardando confirmação
            </div>
        `;
        return;
    }

    container.innerHTML = pendentes.map((p) => {
        const elapsed = Date.now() - p.escaneadoEm;
        const remaining = Math.max(0, Math.ceil((p.tempoLimite - elapsed) / 1000));
        return `
            <div class="pending-item" data-barcode="${p.barcode}">
                <div class="pending-info">
                    <span class="pending-name">${p.nome}</span>
                    <span class="pending-time">⏱️ ${remaining}s para confirmar</span>
                </div>
                <div class="pending-actions">
                    <button class="btn-confirm" onclick="confirmarProdutoUI('${p.barcode}')">
                        <i class="fas fa-check"></i> Confirmar
                    </button>
                    <button class="btn-cancel" onclick="cancelarProdutoUI('${p.barcode}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Atualiza timers em tempo real
    pendentes.forEach(p => {
        const elapsed = Date.now() - p.escaneadoEm;
        const remaining = Math.max(0, Math.ceil((p.tempoLimite - elapsed) / 1000));
        const item = document.querySelector(
            `.pending-item[data-barcode="${p.barcode}"] .pending-time`
        );
        if (item) item.textContent = `⏱️ ${remaining}s para confirmar`;
    });
}

function escanearProdutoUI(produto) {
    const resultado = securitySystem.escanearProduto(produto);
    
    if (resultado.sucesso) {
        mostrarNotificacao(resultado.mensagem, 'success');
        atualizarStatusSeguranca();
        tocarBip();
    } else {
        mostrarNotificacao(resultado.mensagem, 'error');
    }
    
    return resultado;
}

function confirmarProdutoUI(barcode) {
    const resultado = securitySystem.confirmarProduto(barcode);
    
    if (resultado.sucesso) {
        mostrarNotificacao(resultado.mensagem, 'success');
        adicionarProdutoConfirmado(resultado.produto);
        atualizarStatusSeguranca();
        atualizarUI();
    } else {
        mostrarNotificacao(resultado.mensagem, 'error');
    }
}

function cancelarProdutoUI(barcode) {
    const resultado = securitySystem.cancelarProduto(barcode);
    
    if (resultado.sucesso) {
        mostrarNotificacao(resultado.mensagem, 'warning');
        atualizarStatusSeguranca();
    } else {
        mostrarNotificacao(resultado.mensagem, 'error');
    }
}

async function adicionarProdutoConfirmado(produto) {
    try {
        await adicionarAoCarrinho(estado.carrinhoId, produto, 1);
        await carregarCarrinho(estado.carrinhoId);
    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
    }
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const colors = {
        success: '#34a853',
        error: '#ea4335',
        warning: '#fbbc04',
        info: '#1a73e8'
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.style.cssText = `
        background: ${colors[tipo] || '#1a73e8'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        font-size: 14px;
        animation: slideDown 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        pointer-events: auto;
        cursor: default;
    `;
    notification.innerHTML = `
        <i class="fas ${icons[tipo] || 'fa-info-circle'}"></i>
        <span>${mensagem}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;margin-left:auto;font-size:18px;cursor:pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

function tocarBip() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAB...');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {}
}

// Configura callback para timeout
securitySystem.setOnTimeout((produto) => {
    mostrarNotificacao(
        `⏱️ Tempo esgotado! "${produto.nome}" foi removido.`,
        'warning'
    );
    atualizarStatusSeguranca();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        securitySystem,
        escanearProdutoUI,
        confirmarProdutoUI,
        cancelarProdutoUI,
        atualizarStatusSeguranca
    };
}
