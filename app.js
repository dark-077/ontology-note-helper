// 本体论笔记助手 - 核心逻辑
class OntologyNoteHelper {
    constructor() {
        this.cy = null;
        this.currentData = null;
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.initCytoscape();
        this.bindEvents();
        this.loadSettingsToUI();
    }

    // 初始化图谱
    initCytoscape() {
        this.cy = cytoscape({
            container: document.getElementById('cy'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': (ele) => {
                            const importance = ele.data('importance') || 1;
                            if (importance >= 3) return '#6366f1';
                            if (importance >= 2) return '#8b5cf6';
                            return '#a855f7';
                        },
                        'label': 'data(label)',
                        'color': '#fff',
                        'font-size': '12px',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': (ele) => {
                            const importance = ele.data('importance') || 1;
                            return 30 + importance * 10;
                        },
                        'height': (ele) => {
                            const importance = ele.data('importance') || 1;
                            return 30 + importance * 10;
                        },
                        'border-width': 2,
                        'border-color': '#fff',
                        'border-opacity': 0.5,
                        'text-wrap': 'wrap',
                        'text-max-width': 80
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#475569',
                        'target-arrow-color': '#475569',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(relationship)',
                        'font-size': '10px',
                        'color': '#94a3b8',
                        'text-rotation': 'autorotate',
                        'text-margin-y': -10
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'border-width': 3,
                        'border-color': '#f59e0b',
                        'line-color': '#f59e0b',
                        'target-arrow-color': '#f59e0b',
                        'transition-property': 'border-width, border-color',
                        'transition-duration': '0.3s'
                    }
                }
            ],
            layout: {
                name: 'cose',
                animate: true,
                animationDuration: 1000,
                nodeRepulsion: 4000,
                nodeOverlap: 20,
                idealEdgeLength: 100,
                edgeElasticity: 100,
                padding: 30
            }
        });

        // 节点点击事件
        this.cy.on('tap', 'node', (e) => {
            this.showNodeInfo(e.target);
        });

        // 边点击事件
        this.cy.on('tap', 'edge', (e) => {
            this.showEdgeInfo(e.target);
        });

        // 点击空白处清除选中
        this.cy.on('tap', (e) => {
            if (e.target === this.cy) {
                this.cy.elements().unselect();
            }
        });
    }

    // 绑定事件
    bindEvents() {
        // 设置相关
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('hidden');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('hidden');
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
            document.getElementById('settingsModal').classList.add('hidden');
        });

        // 帮助相关
        document.getElementById('helpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('hidden');
        });

        document.getElementById('closeHelp').addEventListener('click', () => {
            document.getElementById('helpModal').classList.add('hidden');
        });

        // 输入区域
        const noteInput = document.getElementById('noteInput');
        noteInput.addEventListener('input', () => {
            document.getElementById('charCount').textContent = noteInput.value.length;
        });

        // 清空按钮
        document.getElementById('clearBtn').addEventListener('click', () => {
            noteInput.value = '';
            document.getElementById('charCount').textContent = '0';
            this.clearGraph();
        });

        // 示例按钮
        document.getElementById('exampleBtn').addEventListener('click', () => {
            noteInput.value = this.getExampleText();
            document.getElementById('charCount').textContent = noteInput.value.length;
        });

        // 提取按钮
        document.getElementById('extractBtn').addEventListener('click', () => {
            this.extractOntology();
        });

        // 演示按钮
        document.getElementById('demoBtn').addEventListener('click', () => {
            this.runDemo();
        });

        // 图谱控制
        document.getElementById('fitBtn').addEventListener('click', () => {
            this.cy.fit(50);
        });

        document.getElementById('resetLayoutBtn').addEventListener('click', () => {
            this.relayout();
        });

        // 导出按钮
        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            this.exportJson();
        });

        document.getElementById('exportImgBtn').addEventListener('click', () => {
            this.exportImage();
        });

        // 点击模态框外部关闭
        ['settingsModal', 'helpModal'].forEach(id => {
            document.getElementById(id).addEventListener('click', (e) => {
                if (e.target.id === id) {
                    e.target.classList.add('hidden');
                }
            });
        });
    }

    // 获取示例文本
    getExampleText() {
        return `人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。

机器学习是人工智能的一个子领域，它使计算机能够在没有明确编程的情况下进行学习。深度学习又是机器学习的一个分支，基于人工神经网络。

自然语言处理（NLP）是AI的重要应用领域，专注于让计算机理解和处理人类语言。

大语言模型（LLM）如GPT和Claude是NLP的最新突破，它们通过海量文本训练来生成连贯的文本。

知识图谱则是一种用图结构存储实体和关系的技术，常用于搜索引擎和推荐系统。

因果推断是统计学的一个分支，研究如何确定变量之间的因果关系，而不仅仅是相关性。它在AI决策系统中扮演着越来越重要的角色。`;
    }

    // 运行演示
    runDemo() {
        const noteInput = document.getElementById('noteInput');
        noteInput.value = this.getExampleText();
        document.getElementById('charCount').textContent = noteInput.value.length;
        this.renderGraph(this.getDemoData());
        this.showToast('已加载演示知识图谱！');
    }

    // 获取演示图谱数据
    getDemoData() {
        return {
            concepts: [
                { id: 'ai', name: '人工智能', definition: '创建能够执行人类智能任务的计算机系统。', importance: 5, category: '核心领域' },
                { id: 'ml', name: '机器学习', definition: '让计算机从数据中学习规律的方法。', importance: 4, category: 'AI子领域' },
                { id: 'dl', name: '深度学习', definition: '基于多层神经网络的机器学习方法。', importance: 4, category: 'AI子领域' },
                { id: 'nn', name: '人工神经网络', definition: '模拟生物神经系统的计算模型。', importance: 3, category: '技术基础' },
                { id: 'nlp', name: '自然语言处理', definition: '让计算机理解和处理人类语言的技术。', importance: 4, category: '应用领域' },
                { id: 'llm', name: '大语言模型', definition: '通过海量文本训练生成和理解语言的大型模型。', importance: 5, category: '前沿技术' },
                { id: 'kg', name: '知识图谱', definition: '用图结构表达实体及其关系的知识表示方法。', importance: 3, category: '知识表示' },
                { id: 'causal', name: '因果推断', definition: '研究变量之间因果关系而非单纯相关性的统计方法。', importance: 4, category: '推理方法' }
            ],
            relationships: [
                { source: 'ml', target: 'ai', relationship: '属于', description: '机器学习是人工智能的一个重要子领域。' },
                { source: 'dl', target: 'ml', relationship: '属于', description: '深度学习是机器学习的一个分支。' },
                { source: 'dl', target: 'nn', relationship: '基于', description: '深度学习通常基于人工神经网络构建。' },
                { source: 'nlp', target: 'ai', relationship: '应用于', description: '自然语言处理是人工智能的重要应用方向。' },
                { source: 'llm', target: 'nlp', relationship: '突破于', description: '大语言模型是自然语言处理领域的重要突破。' },
                { source: 'llm', target: 'dl', relationship: '依赖', description: '大语言模型依赖深度学习架构进行训练。' },
                { source: 'kg', target: 'ai', relationship: '支撑', description: '知识图谱为AI系统提供结构化知识。' },
                { source: 'causal', target: 'ai', relationship: '增强', description: '因果推断增强AI系统的决策和解释能力。' },
                { source: 'kg', target: 'nlp', relationship: '辅助', description: '知识图谱可辅助自然语言理解与问答。' }
            ]
        };
    }

    // 保存设置
    saveSettings() {
        this.settings = {
            accessCode: document.getElementById('accessCode').value
        };
        localStorage.setItem('ontologySettings', JSON.stringify(this.settings));
        this.showToast('设置已保存！');
    }

    // 加载设置
    loadSettings() {
        const saved = localStorage.getItem('ontologySettings');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            accessCode: ''
        };
    }

    // 设置加载到UI
    loadSettingsToUI() {
        document.getElementById('accessCode').value = this.settings.accessCode || '';
    }

    // 显示状态
    showStatus(text, loading = true) {
        const statusBar = document.getElementById('statusBar');
        const statusText = document.getElementById('statusText');
        const statusIcon = document.getElementById('statusIcon');

        statusBar.classList.remove('hidden');
        statusText.textContent = text;

        if (loading) {
            statusIcon.innerHTML = '<i class="fa fa-circle-o-notch text-primary"></i>';
            statusIcon.classList.add('animate-spin');
        } else {
            statusIcon.innerHTML = '<i class="fa fa-check text-green-500"></i>';
            statusIcon.classList.remove('animate-spin');
        }
    }

    // 隐藏状态
    hideStatus() {
        setTimeout(() => {
            document.getElementById('statusBar').classList.add('hidden');
        }, 2000);
    }

    // 显示Toast
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // 提取本体论
    async extractOntology() {
        const text = document.getElementById('noteInput').value.trim();

        if (!text) {
            this.showToast('请先输入笔记内容！');
            return;
        }

        this.showStatus('正在分析文本，提取概念和关系...');

        try {
            const result = await this.callLocalAPI(text);
            this.renderGraph(result);
            this.showStatus('AI 分析完成！', false);
            this.hideStatus();
        } catch (error) {
            console.warn('后端不可用，使用本地规则提取:', error);
            const result = this.extractWithLocalRules(text);
            this.renderGraph(result);
            this.showStatus('已使用本地规则生成图谱', false);
            this.hideStatus();
            this.showToast('当前为 GitHub Pages 展示模式，已使用本地规则生成图谱');
        }
    }

    // 本地规则提取，适合 GitHub Pages 展示版
    extractWithLocalRules(text) {
        const stopWords = new Set(['我们', '你们', '他们', '这个', '那个', '一种', '一个', '以及', '并且', '因此', '如果', '但是', '因为', '所以', '通过', '进行', '可以', '需要', '通常', '主要', '重要', '领域', '系统', '方法', '技术', '内容', '问题', '方面', '过程', '结果', '具有', '能够', '之间', '用于']);
        const domainWords = ['人工智能', '机器学习', '深度学习', '神经网络', '自然语言处理', '大语言模型', '知识图谱', '因果推断', '本体论', '概念', '关系', '教育', '学习', '编程', '数据', '模型', '算法', '智能体', '决策', '推荐', '诊断'];
        const frequency = new Map();
        const contextMap = new Map();
        const sentences = text.split(/[。！？.!?\n]/).map((item) => item.trim()).filter(Boolean);

        const addCandidate = (name, sentence, weight = 1) => {
            const cleaned = name.replace(/[，。！？、；：,.!?;:\s]/g, '').trim();
            if (cleaned.length < 2 || cleaned.length > 12 || stopWords.has(cleaned)) return;
            if (/^[0-9]+$/.test(cleaned)) return;
            frequency.set(cleaned, (frequency.get(cleaned) || 0) + weight);
            if (!contextMap.has(cleaned)) contextMap.set(cleaned, sentence);
        };

        sentences.forEach((sentence) => {
            domainWords.forEach((word) => {
                if (sentence.includes(word)) addCandidate(word, sentence, 4);
            });

            const bracketMatches = sentence.match(/[一-龥A-Za-z]{2,12}[（(][A-Za-z0-9\-]{2,12}[）)]/g) || [];
            bracketMatches.forEach((item) => addCandidate(item.replace(/[（(].*?[）)]/g, ''), sentence, 3));

            const nounMatches = sentence.match(/[一-龥A-Za-z]{2,8}(系统|模型|算法|方法|工具|助手|平台|图谱|网络|机制|框架|理论|能力|路径|数据|知识|智能体)/g) || [];
            nounMatches.forEach((item) => addCandidate(item, sentence, 2));

            const shortMatches = sentence.match(/[一-龥A-Za-z]{2,6}/g) || [];
            shortMatches.forEach((item) => addCandidate(item, sentence, 1));
        });

        const concepts = [...frequency.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
            .filter(([name], index, arr) => !arr.slice(0, index).some(([existing]) => existing.includes(name) && existing !== name))
            .slice(0, 12)
            .map(([name, score], index) => ({
                id: `concept_${index + 1}`,
                name,
                definition: this.buildLocalDefinition(name, contextMap.get(name), score),
                importance: Math.max(1, Math.min(5, Math.ceil(score / 2))),
                category: index < 3 ? '核心概念' : index < 8 ? '关联概念' : '扩展概念'
            }));

        if (concepts.length === 0) {
            return this.getDemoData();
        }

        const relationships = this.buildLocalRelationships(sentences, concepts);
        return { concepts, relationships };
    }

    buildLocalDefinition(name, sentence, score) {
        if (!sentence) return `文本中的关键概念，综合权重 ${score}。`;
        const summary = sentence.length > 42 ? sentence.slice(0, 42) + '...' : sentence;
        return `来自语境：“${summary}”`;
    }

    buildLocalRelationships(sentences, concepts) {
        const relationships = [];
        const relationPatterns = [
            { keyword: '属于', relation: '属于' },
            { keyword: '包括', relation: '包含' },
            { keyword: '包含', relation: '包含' },
            { keyword: '基于', relation: '基于' },
            { keyword: '依赖', relation: '依赖' },
            { keyword: '应用', relation: '应用于' },
            { keyword: '用于', relation: '用于' },
            { keyword: '影响', relation: '影响' },
            { keyword: '导致', relation: '导致' },
            { keyword: '支撑', relation: '支撑' },
            { keyword: '促进', relation: '促进' },
            { keyword: '是', relation: '定义/归属' }
        ];

        sentences.forEach((sentence) => {
            const appeared = concepts
                .filter((concept) => sentence.includes(concept.name))
                .sort((a, b) => sentence.indexOf(a.name) - sentence.indexOf(b.name));

            if (appeared.length < 2) return;

            for (let i = 0; i < appeared.length - 1 && relationships.length < 20; i++) {
                const source = appeared[i];
                const target = appeared[i + 1];
                const pattern = relationPatterns.find((item) => sentence.includes(item.keyword));
                this.addRelationship(relationships, source, target, pattern ? pattern.relation : '相关于', sentence);
            }
        });

        if (relationships.length === 0 && concepts.length > 1) {
            concepts.slice(1).forEach((concept) => {
                this.addRelationship(relationships, concepts[0], concept, '相关于', `“${concept.name}”与核心概念“${concepts[0].name}”存在文本关联。`);
            });
        }

        return relationships;
    }

    addRelationship(relationships, source, target, relationship, sentence) {
        if (source.id === target.id) return;
        if (relationships.some((item) => item.source === source.id && item.target === target.id)) return;
        const summary = sentence.length > 46 ? sentence.slice(0, 46) + '...' : sentence;
        relationships.push({
            source: source.id,
            target: target.id,
            relationship,
            description: `关系依据：“${summary}”`
        });
    }

    // 调用本地后端API
    async callLocalAPI(text) {
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                accessCode: this.settings.accessCode || ''
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '本地API调用失败');
        }
        return data;
    }


    // 渲染图谱
    renderGraph(data) {
        this.currentData = data;
        this.cy.elements().remove();

        // 添加节点
        const nodes = data.concepts.map(c => ({
            data: {
                id: c.id,
                label: c.name,
                definition: c.definition,
                importance: c.importance,
                category: c.category
            }
        }));

        // 添加边
        const edges = data.relationships.map(r => ({
            data: {
                id: `${r.source}-${r.target}`,
                source: r.source,
                target: r.target,
                relationship: r.relationship,
                description: r.description
            }
        }));

        this.cy.add([...nodes, ...edges]);

        // 应用布局
        this.relayout();

        // 更新统计
        this.updateStats();

        // 显示图例和统计面板
        document.getElementById('legend').classList.remove('hidden');
        document.getElementById('statsPanel').classList.remove('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    // 重新布局
    relayout() {
        this.cy.layout({
            name: 'cose',
            animate: true,
            animationDuration: 1000,
            nodeRepulsion: 4000,
            nodeOverlap: 20,
            idealEdgeLength: 120,
            edgeElasticity: 80,
            padding: 50
        }).run();
    }

    // 更新统计信息
    updateStats() {
        const nodes = this.cy.nodes().length;
        const edges = this.cy.edges().length;
        const maxPossibleEdges = nodes * (nodes - 1) / 2;
        const density = maxPossibleEdges > 0 ? ((edges / maxPossibleEdges) * 100).toFixed(1) : 0;

        document.getElementById('nodeCount').textContent = nodes;
        document.getElementById('edgeCount').textContent = edges;
        document.getElementById('density').textContent = density + '%';
    }

    // 显示节点信息
    showNodeInfo(node) {
        const panel = document.getElementById('conceptPanel');
        const content = document.getElementById('conceptContent');

        panel.classList.remove('hidden');

        const importanceColors = ['bg-gray-500', 'bg-accent', 'bg-secondary', 'bg-primary', 'bg-yellow-500'];
        const importanceLabels = ['普通', '低', '中', '高', '核心'];

        content.innerHTML = `
            <div class="bg-slate-800/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold text-lg">${node.data('label')}</h3>
                    <span class="text-xs ${importanceColors[node.data('importance') - 1]} px-2 py-1 rounded">
                        ${importanceLabels[node.data('importance') - 1]}概念
                    </span>
                </div>
                <p class="text-sm text-gray-300 mb-3">${node.data('definition') || '暂无定义'}</p>
                <div class="text-xs text-gray-400">
                    <span class="bg-slate-700 px-2 py-1 rounded">${node.data('category') || '未分类'}</span>
                </div>
            </div>
            <div class="text-xs text-gray-400 mt-2">
                <i class="fa fa-exchange mr-1"></i>
                连接数量: ${node.connectedEdges().length}
            </div>
        `;
    }

    // 显示边信息
    showEdgeInfo(edge) {
        const panel = document.getElementById('conceptPanel');
        const content = document.getElementById('conceptContent');

        panel.classList.remove('hidden');

        const sourceNode = this.cy.$id(edge.data('source'));
        const targetNode = this.cy.$id(edge.data('target'));

        content.innerHTML = `
            <div class="bg-slate-800/50 rounded-lg p-4">
                <div class="text-center mb-3">
                    <span class="font-bold">${sourceNode.data('label')}</span>
                    <i class="fa fa-arrow-right mx-2 text-primary"></i>
                    <span class="font-bold">${targetNode.data('label')}</span>
                </div>
                <div class="text-center mb-3">
                    <span class="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">
                        ${edge.data('relationship')}
                    </span>
                </div>
                <p class="text-sm text-gray-300">${edge.data('description') || '暂无描述'}</p>
            </div>
        `;
    }

    // 清空图谱
    clearGraph() {
        this.cy.elements().remove();
        this.currentData = null;
        document.getElementById('legend').classList.add('hidden');
        document.getElementById('statsPanel').classList.add('hidden');
        document.getElementById('conceptPanel').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    }

    // 导出JSON
    exportJson() {
        if (!this.currentData) {
            this.showToast('没有可导出的数据！');
            return;
        }

        const dataStr = JSON.stringify(this.currentData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ontology-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('JSON已导出！');
    }

    // 导出图片
    exportImage() {
        if (this.cy.nodes().length === 0) {
            this.showToast('没有可导出的图谱！');
            return;
        }

        const png = this.cy.png({
            full: true,
            scale: 2,
            background: '#1e293b'
        });

        const a = document.createElement('a');
        a.href = png;
        a.download = `ontology-graph-${Date.now()}.png`;
        a.click();

        this.showToast('图片已导出！');
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OntologyNoteHelper();
});
