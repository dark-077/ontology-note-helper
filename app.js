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

        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-primary');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-primary');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-primary');
            this.handleFileSelect(e.dataTransfer.files[0]);
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

    async handleFileSelect(file) {
        if (!file) return;

        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showLimitDialog('文件过大', '当前仅支持上传 20MB 以内的文件。请压缩文件或拆分内容后再上传。');
            return;
        }

        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.ppt')) {
            this.showLimitDialog('暂不支持 .ppt 旧格式', '请在 PowerPoint/WPS 中将文件另存为 .pptx 格式后重新上传。');
            return;
        }
        if (lowerName.endsWith('.doc')) {
            this.showLimitDialog('暂不支持 .doc 旧格式', '请在 Word/WPS 中将文件另存为 .docx 格式后重新上传。');
            return;
        }

        this.showFileInfo(`正在解析：${file.name}`);
        this.showStatus('正在读取文件内容...');

        try {
            const text = await this.extractTextFromFile(file);
            if (!text.trim()) {
                this.showLimitDialog('没有提取到文字', '如果这是扫描版 PDF，浏览器无法直接读取其中的文字。建议将页面截图后以图片形式上传，使用 OCR 识别。');
                throw new Error('未能从文件中提取到文字');
            }

            const noteInput = document.getElementById('noteInput');
            noteInput.value = text.trim();
            document.getElementById('charCount').textContent = noteInput.value.length;
            this.showFileInfo(`已导入：${file.name}，提取 ${noteInput.value.length} 个字符`);
            this.showStatus('文件解析完成，可生成知识图谱', false);
            this.hideStatus();
        } catch (error) {
            console.error('文件解析失败:', error);
            this.showFileInfo(`解析失败：${error.message}`);
            document.getElementById('statusBar').classList.add('hidden');
            this.showToast('文件解析失败：' + error.message);
        }
    }

    showFileInfo(message) {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.classList.remove('hidden');
        fileInfo.textContent = message;
    }

    showLimitDialog(title, message) {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4';
        dialog.innerHTML = `
            <div class="bg-slate-800 border border-amber-500/30 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <div class="flex items-start gap-3 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                        <i class="fa fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg text-white">${title}</h3>
                        <p class="text-sm text-gray-300 mt-2 leading-6">${message}</p>
                    </div>
                </div>
                <button class="w-full gradient-bg py-2 rounded-lg font-medium hover:opacity-90 transition">知道了</button>
            </div>
        `;
        dialog.querySelector('button').addEventListener('click', () => dialog.remove());
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) dialog.remove();
        });
        document.body.appendChild(dialog);
    }

    async extractTextFromFile(file) {
        const name = file.name.toLowerCase();
        const type = file.type;

        if (name.endsWith('.txt') || name.endsWith('.md') || type.startsWith('text/')) {
            return await file.text();
        }

        if (name.endsWith('.pdf') || type === 'application/pdf') {
            return await this.extractPdfText(file);
        }

        if (name.endsWith('.docx')) {
            return await this.extractDocxText(file);
        }

        if (name.endsWith('.pptx')) {
            return await this.extractPptxText(file);
        }

        if (type.startsWith('image/') || /\.(png|jpg|jpeg)$/i.test(name)) {
            return await this.extractImageText(file);
        }

        if (name.endsWith('.ppt')) {
            throw new Error('暂不支持 .ppt 旧格式，请另存为 .pptx 后上传');
        }

        if (name.endsWith('.doc')) {
            throw new Error('暂不支持 .doc 旧格式，请另存为 .docx 后上传');
        }

        throw new Error('暂不支持该文件类型');
    }

    async extractPdfText(file) {
        const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.min.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs';
        const data = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const pages = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            pages.push(content.items.map((item) => item.str).join(' '));
        }

        return pages.join('\n\n');
    }

    async extractDocxText(file) {
        if (!window.mammoth) throw new Error('Word 解析库加载失败，请刷新页面重试');
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }

    async extractPptxText(file) {
        if (!window.JSZip) throw new Error('PPTX 解析库加载失败，请刷新页面重试');
        const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
        const slideFiles = Object.keys(zip.files)
            .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
            .sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));

        const slides = [];
        for (const path of slideFiles) {
            const xml = await zip.files[path].async('text');
            const doc = new DOMParser().parseFromString(xml, 'application/xml');
            const texts = [...doc.getElementsByTagName('a:t')].map((node) => node.textContent).filter(Boolean);
            if (texts.length) slides.push(texts.join(' '));
        }

        return slides.join('\n\n');
    }

    async extractImageText(file) {
        if (!window.Tesseract) throw new Error('图片 OCR 库加载失败，请刷新页面重试');
        this.showLimitDialog('图片 OCR 可能较慢', '首次识别图片需要加载 OCR 模型，可能等待几十秒。图片越清晰，识别效果越好。');
        this.showStatus('正在识别图片文字，可能需要几十秒...');
        const result = await window.Tesseract.recognize(file, 'chi_sim+eng');
        return result.data.text;
    }

    // 获取示例文本
    getExampleText() {
        return `International graduate students often read papers, lecture slides, and project documents across different courses. They need to quickly understand unfamiliar concepts, compare theories, and decide what to study next.

Artificial intelligence can help learners organize research notes into structured knowledge. Knowledge graphs connect concepts, definitions, methods, datasets, and application scenarios. Ontology modeling makes those connections explicit and easier to review.

A ResearchGraph Agent should not only extract keywords. It should identify central concepts, explain relationships, summarize the material, reveal knowledge gaps, and recommend next actions such as reading prerequisite concepts, comparing methods, or preparing a presentation outline.

For overseas learners, this workflow is useful when they study in a second language, join interdisciplinary courses, or prepare research discussions with limited time.`;
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
                { id: 'researchgraph_agent', name: 'ResearchGraph Agent', definition: '把学习材料转化为概念图谱、洞察和行动建议的研究学习智能体。', importance: 5, category: 'Agent 产品' },
                { id: 'overseas_learners', name: 'Overseas learners', definition: '需要跨语言、跨学科理解课程和研究材料的国际学生与研究者。', importance: 5, category: '目标用户' },
                { id: 'knowledge_graph', name: 'Knowledge graph', definition: '用节点和边表示概念、定义、方法与应用场景之间的结构。', importance: 4, category: '知识表示' },
                { id: 'ontology_modeling', name: 'Ontology modeling', definition: '把概念和关系显式化，帮助学习者形成稳定的知识结构。', importance: 4, category: '分析方法' },
                { id: 'research_notes', name: 'Research notes', definition: '论文、讲义、项目材料和课堂笔记等输入材料。', importance: 3, category: '输入材料' },
                { id: 'knowledge_gaps', name: 'Knowledge gaps', definition: '材料中隐含但学习者可能尚未掌握的前置知识或薄弱环节。', importance: 4, category: 'Agent 洞察' },
                { id: 'next_actions', name: 'Next actions', definition: 'Agent 推荐的阅读、比较、复盘或展示准备任务。', importance: 4, category: 'Agent 行动' },
                { id: 'gmi_cloud', name: 'GMI Cloud', definition: '比赛版后端接入的 Inference Engine API 平台。', importance: 3, category: '模型平台' }
            ],
            relationships: [
                { source: 'researchgraph_agent', target: 'research_notes', relationship: '读取', description: 'Agent 接收课程、论文和项目材料作为分析输入。' },
                { source: 'researchgraph_agent', target: 'knowledge_graph', relationship: '生成', description: 'Agent 将非结构化文本转化为可视化知识图谱。' },
                { source: 'knowledge_graph', target: 'ontology_modeling', relationship: '基于', description: '图谱结构依赖本体论建模来定义概念和关系。' },
                { source: 'researchgraph_agent', target: 'knowledge_gaps', relationship: '识别', description: 'Agent 发现材料中的前置知识缺口和理解风险。' },
                { source: 'knowledge_gaps', target: 'next_actions', relationship: '转化为', description: '识别到的缺口会被转化为可执行学习行动。' },
                { source: 'overseas_learners', target: 'researchgraph_agent', relationship: '使用', description: '海外学习者使用 Agent 快速理解英文材料和跨学科内容。' },
                { source: 'researchgraph_agent', target: 'gmi_cloud', relationship: '调用', description: '比赛版通过后端调用 GMI Cloud Inference Engine。' }
            ],
            agentReport: {
                summary: 'ResearchGraph Agent helps global learners turn fragmented academic materials into a structured concept map and an action-oriented study plan.',
                insights: [
                    '目标用户不是泛学习者，而是需要快速理解英文/跨学科材料的海外学生和研究者。',
                    '产品价值不止是关键词抽取，而是把图谱、洞察和下一步行动连成完整工作流。',
                    'GMI Cloud API 位于后端，避免把模型 Token 暴露给公开网页。'
                ],
                gaps: [
                    '当前公开 GitHub Pages 版本使用本地规则 fallback，GMI 在线推理需要账号额度开通。',
                    '扫描版 PDF 仍依赖图片 OCR，复杂排版文档需要更强的解析链路。'
                ],
                actions: [
                    '用一篇英文论文或课程讲义录制 2 分钟演示视频。',
                    '开通 GMI 额度后截取 /api/provider 和 /api/extract 调用结果。',
                    '在提交文档中强调 Ingest → Reason → Act 的 Agent 工作流。'
                ]
            }
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
        return {
            concepts,
            relationships,
            agentReport: this.buildLocalAgentReport(text, concepts, relationships)
        };
    }

    buildLocalDefinition(name, sentence, score) {
        if (!sentence) return `文本中的关键概念，综合权重 ${score}。`;
        const summary = sentence.length > 42 ? sentence.slice(0, 42) + '...' : sentence;
        return `来自语境：“${summary}”`;
    }

    buildLocalAgentReport(text, concepts, relationships) {
        const topConcepts = concepts.slice(0, 4).map((concept) => concept.name);
        return {
            summary: `Agent 识别出 ${concepts.length} 个核心概念和 ${relationships.length} 条关系，材料重点集中在：${topConcepts.join('、')}。`,
            insights: [
                `最核心的概念是“${concepts[0]?.name || '暂无'}”，建议优先围绕它复盘材料结构。`,
                relationships.length > concepts.length ? '材料中的概念联系较密集，适合整理成展示型知识图谱。' : '材料中的概念联系偏稀疏，建议补充定义、例子和应用场景。',
                text.length > 1500 ? '输入材料较长，适合拆分为主题模块后分别分析。' : '输入材料较短，适合作为课堂笔记或摘要的快速结构化分析。'
            ],
            gaps: [
                '本地规则模式无法真正理解深层语义，GMI Cloud 可用后建议切换为在线模型分析。',
                '如果图谱中有孤立概念，说明原文可能缺少定义、因果关系或应用说明。'
            ],
            actions: [
                '先阅读图谱中的核心概念，再沿着关系边复述材料逻辑。',
                '把 Agent 报告中的 gaps 转化为下一轮提问或补充阅读任务。',
                '导出 JSON 或图片，用于课程汇报、论文讨论或项目展示。'
            ]
        };
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
        this.renderAgentReport(data.agentReport);

        // 显示图例和统计面板
        document.getElementById('legend').classList.remove('hidden');
        document.getElementById('statsPanel').classList.remove('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    renderAgentReport(report) {
        const panel = document.getElementById('agentPanel');
        const content = document.getElementById('agentContent');
        if (!report) {
            panel.classList.add('hidden');
            return;
        }

        const list = (items = []) => items.map((item) => `<li class="flex gap-2"><span class="text-primary mt-1">•</span><span>${item}</span></li>`).join('');
        content.innerHTML = `
            <div class="bg-slate-800/50 rounded-lg p-3">
                <div class="text-xs uppercase tracking-wide text-primary mb-1">Summary</div>
                <p>${report.summary || '暂无摘要'}</p>
            </div>
            <div class="grid grid-cols-1 gap-3">
                <div class="bg-slate-800/50 rounded-lg p-3">
                    <div class="font-medium text-white mb-2">Key insights</div>
                    <ul class="space-y-1">${list(report.insights)}</ul>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-3">
                    <div class="font-medium text-white mb-2">Gaps / risks</div>
                    <ul class="space-y-1">${list(report.gaps)}</ul>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-3">
                    <div class="font-medium text-white mb-2">Next actions</div>
                    <ul class="space-y-1">${list(report.actions)}</ul>
                </div>
            </div>
        `;
        panel.classList.remove('hidden');
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
        document.getElementById('agentPanel').classList.add('hidden');
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
