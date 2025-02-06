// 显示完整文章（移到全局最顶部）
async function showFullPost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`);
        const post = await response.json();
        
        // 配置 marked 选项
        marked.setOptions({
            gfm: true,
            breaks: true,
            highlight: function(code, language) {
                if (language && Prism.languages[language]) {
                    return Prism.highlight(code, Prism.languages[language], language);
                }
                return code;
            },
            langPrefix: 'language-',
            pedantic: false,
            headerIds: true
        });

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'post-modal';
        modal.innerHTML = `
            <div class="post-modal-content">
                <div class="post-modal-header">
                    <h2>${post.title}</h2>
                    <button class="close-btn" onclick="this.closest('.post-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="post-modal-body">
                    <div class="post-meta">
                        <span><i class="fas fa-user"></i> ${post.author}</span>
                        <span><i class="far fa-clock"></i> ${new Date(post.created_at).toLocaleString()}</span>
                    </div>
                    <div class="post-content markdown-body">
                        ${marked.parse(post.content)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 重新触发 Prism 高亮
        Prism.highlightAllUnder(modal);
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.contains(modal)) {
                modal.remove();
            }
        });
    } catch (error) {
        console.error('加载文章失败:', error);
        alert('加载文章失败');
    }
}

// 将所有需要全局访问的函数移到外部
// 保存草稿
async function saveDraft() {
    const title = document.getElementById('title').value;
    const content = editor.getValue(); // 使用编辑器的getValue方法
    const author = document.getElementById('author').value || '匿名';
    const postForm = document.getElementById('postForm');
    const draftId = postForm.dataset.draftId;

    if (!title || !content) {
        alert('标题和内容不能为空！');
        return;
    }

    try {
        const url = draftId ? `/api/posts/drafts/${draftId}` : '/api/posts/drafts';
        const method = draftId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                content,
                author
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '保存失败');
        }

        alert('草稿保存成功！');
        clearForm();
        await loadDrafts();
    } catch (error) {
        console.error('保存草稿时出错:', error);
        alert(`保存失败: ${error.message}`);
    }
}

// 清空表单
function clearForm() {
    document.getElementById('title').value = '';
    editor.setValue(''); // 使用编辑器的setValue方法清空内容
    document.getElementById('author').value = '';
    document.getElementById('postForm').dataset.editing = '';
    document.getElementById('postForm').dataset.draftId = '';
}

// 加载草稿列表
async function loadDrafts() {
    try {
        const response = await fetch('/api/posts/drafts');
        const drafts = await response.json();
        
        // 更新管理员视图的草稿列表
        const adminDraftsContainer = document.getElementById('adminDraftsContainer');
        if (adminDraftsContainer) {
            adminDraftsContainer.innerHTML = drafts.map(draft => {
                // 处理预览内容
                let previewContent = draft.content;
                if (previewContent.length > 100) {
                    const match = previewContent.substring(0, 100).match(/^([\s\S]*?)(```[\s\S]*?```|\n\n|\r\n\r\n|$)/);
                    previewContent = match ? match[1] : previewContent.substring(0, 100);
                }
                
                // 使用 marked 解析预览内容
                const parsedContent = marked.parse(previewContent);

                return `
                <div class="admin-post-item draft">
                    <div class="post-header">
                        <h4>${draft.title}</h4>
                        <div class="post-meta">
                            <span>作者: ${draft.author}</span>
                                <span>保存时间: ${new Date(draft.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="post-content-preview markdown-body">
                            ${parsedContent}...
                    </div>
                    <div class="post-actions">
                            <button onclick="editDraft('${draft.id}')" class="btn secondary">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                            <button onclick="publishDraft('${draft.id}')" class="btn success">
                            <i class="fas fa-paper-plane"></i> 发布
                        </button>
                            <button onclick="deleteDraft('${draft.id}')" class="btn danger">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        }
        
        // 重新触发 Prism 高亮
        if (adminDraftsContainer) {
            Prism.highlightAllUnder(adminDraftsContainer);
        }
    } catch (error) {
        console.error('加载草稿失败:', error);
    }
}

// 编辑草稿
async function editDraft(draftId) {
    try {
        const response = await fetch(`/api/posts/drafts/${draftId}`);
        const draft = await response.json();
        
        // 填充表单
        document.getElementById('title').value = draft.title;
        editor.setValue(draft.content); // 使用 editor.setValue() 设置内容
        document.getElementById('author').value = draft.author;
        
        // 记录正在编辑的草稿ID
        document.getElementById('postForm').dataset.draftId = draftId;
        
        // 滚动到表单位置
        document.getElementById('postForm').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('加载草稿失败:', error);
        alert('加载草稿失败，请重试');
    }
}

// 删除草稿
async function deleteDraft(draftId) {
    if (confirm('确定要删除这篇草稿吗？')) {
        try {
            const response = await fetch(`/api/posts/drafts/${draftId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('删除失败');
            }

            alert('草稿已删除');
            loadDrafts(); // 刷新草稿列表
        } catch (error) {
            console.error('删除草稿时出错:', error);
            alert('删除失败，请重试');
        }
    }
}

// 发布草稿
async function publishDraft(draftId) {
    if (confirm('确定要发布这篇文章吗？')) {
        try {
            const response = await fetch(`/api/posts/${draftId}/publish`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('发布失败');
            }

            alert('文章发布成功！');
            loadDrafts(); // 刷新草稿列表
            loadPosts(); // 刷新已发布文章列表
        } catch (error) {
            console.error('发布文章时出错:', error);
            //alert('发布失败，请重试');
        }
    }
}

// 管理员界面功能
// 编辑文章
async function editPost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`);
        const post = await response.json();
        
        document.getElementById('title').value = post.title;
        editor.setValue(post.content); // 使用 editor.setValue() 设置内容
        document.getElementById('author').value = post.author;
        document.getElementById('postForm').dataset.editing = postId;
        
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('加载文章失败:', error);
        alert('加载文章失败');
    }
}

// 删除文章
async function deletePost(postId) {
    if (!confirm('确定要删除这篇文章吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除失败');
        }

        await loadAdminPosts(); // 重新加载文章列表
    } catch (error) {
        console.error('删除文章失败:', error);
        alert('删除文章失败');
    }
}

// 发布文章
async function publishPost() {
    const title = document.getElementById('title').value;
    const content = editor.getValue(); // 使用编辑器的getValue方法
    const author = document.getElementById('author').value || '匿名';
    const postForm = document.getElementById('postForm');
    const editingId = postForm.dataset.editing;

    if (!title || !content) {
        alert('标题和内容不能为空！');
        return;
    }

    try {
        const url = editingId ? `/api/posts/${editingId}` : '/api/posts';
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                content,
                author
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '发布失败');
        }

        alert(editingId ? '文章更新成功！' : '文章发布成功！');
        clearForm();
        await loadAdminPosts();
    } catch (error) {
        console.error('发布文章时出错:', error);
        alert(`发布失败: ${error.message}`);
    }
}

// 加载管理员文章列表
async function loadAdminPosts() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        renderAdminPosts(posts);
    } catch (err) {
        console.error('加载管理文章失败:', err);
    }
}

// 渲染管理员文章列表
function renderAdminPosts(posts) {
    const container = document.getElementById('adminPostsContainer');
    if (!container) return;
    
    container.innerHTML = posts.map(post => {
        // 处理预览内容
        let previewContent = post.content;
        if (previewContent.length > 100) {
            previewContent = previewContent.substring(0, 100);
        }
        
        // 使用 marked 解析预览内容
        const parsedContent = marked.parse(previewContent);

        return `
            <div class="admin-post-item draft">
                <div class="post-header">
                    <h4>${post.title}</h4>
                    <div class="post-meta">
                        <span>作者: ${post.author}</span>
                        <span>发布时间: ${new Date(post.created_at).toLocaleString()}</span>
                    </div>
                </div>
                <div class="post-content-preview markdown-body">
                    ${parsedContent}...
                </div>
                <div class="post-actions">
                    <button onclick="editPost('${post.id}')" class="btn secondary">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button onclick="deletePost('${post.id}')" class="btn danger">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // 重新触发 Prism 高亮
    Prism.highlightAllUnder(container);
}

// 显示管理员登录模态框
function showAdminLogin() {
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        adminModal.style.display = 'flex';
        
        // 添加登录按钮点击事件
        const modalLogin = document.getElementById('modalLogin');
        if (modalLogin) {
            modalLogin.onclick = () => {
                const user = document.getElementById('adminUser').value;
                const pass = document.getElementById('adminPass').value;
                
                if (user === '123' && pass === '123') {
                    alert('登录成功');
                    initAdminPanel();
                } else {
                    alert('账号或密码错误');
                }
            };
        }

        // 添加点击背景关闭功能
        adminModal.onclick = (e) => {
            if (e.target === adminModal) {
                adminModal.style.display = 'none';
            }
        };
    }
}

// 初始化管理员界面
function initAdminPanel() {
    const adminModal = document.getElementById('adminModal');
    const userView = document.getElementById('userView');
    const adminView = document.getElementById('adminView');
    
    // 隐藏登录模态框
    adminModal.style.display = 'none';
    // 切换视图
    userView.style.display = 'none';
    adminView.style.display = 'block';
    
    // 加载文章列表
    loadAdminPosts();
    loadDrafts();
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化编辑器
    let editor;
    const textArea = document.getElementById('content');
    if (textArea) {
        editor = CodeMirror.fromTextArea(textArea, {
            mode: 'markdown',
            theme: 'default',
            lineNumbers: false,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            autofocus: true,
            viewportMargin: Infinity,
            styleActiveLine: true,
            placeholder: '在这里输入文章内容...'
        });

        // 绑定工具栏按钮事件
        const toolbarActions = {
            'fa-heading': (text, match) => `\n# ${text}\n`,
            'fa-heading1': (text) => `\n# ${text}\n`,
            'fa-heading2': (text) => `\n## ${text}\n`,
            'fa-heading3': (text) => `\n### ${text}\n`,
            'fa-bold': (text) => `**${text}**`,
            'fa-italic': (text) => `*${text}*`,
            'fa-strikethrough': (text) => `~~${text}~~`,
            'fa-list-ul': (text) => text.split('\n').map(line => `- ${line}`).join('\n'),
            'fa-list-ol': (text) => text.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n'),
            'fa-tasks': (text) => text.split('\n').map(line => `- [ ] ${line}`).join('\n'),
            'fa-quote-right': (text) => text.split('\n').map(line => `> ${line}`).join('\n'),
            'fa-code': (text) => `\n\`\`\`\n${text}\n\`\`\`\n`,
            'fa-link': (text) => `[${text}](url)`,
            'fa-image': () => '![图片描述](图片链接)',
            'fa-table': () => '\n| 标题1 | 标题2 | 标题3 |\n|-------|-------|-------|\n| 内容1 | 内容2 | 内容3 |\n'
        };

        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const iconClass = Array.from(btn.querySelector('i').classList)
                    .find(cls => cls.startsWith('fa-'));
                const action = toolbarActions[iconClass];
                
                if (action) {
                    const doc = editor.getDoc();
                    const cursor = doc.getCursor();
                    const selection = doc.getSelection();
                    
                    if (selection) {
                        doc.replaceSelection(action(selection));
                    } else {
                        const placeholder = {
                            'fa-link': '链接文字',
                            'fa-heading': '标题',
                            'fa-heading1': '一级标题',
                            'fa-heading2': '二级标题',
                            'fa-heading3': '三级标题',
                            'fa-code': '代码'
                        }[iconClass] || '文字';
                        
                        doc.replaceRange(action(placeholder), cursor);
                    }
                    editor.focus();
                }
            });
        });

        // 设置编辑器高度
        editor.setSize(null, 500);

        // 创建工具栏容器
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        editor.getWrapperElement().appendChild(toolbar);

        // 绑定发布按钮事件
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', async () => {
                const title = document.getElementById('title').value;
                const content = editor.getValue();
                const author = document.getElementById('author').value || '匿名';
                
                if (!title || !content) {
                    alert('标题和内容不能为空！');
                    return;
                }

                try {
                    const response = await fetch('/api/posts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ title, content, author })
                    });

                    if (!response.ok) {
                        throw new Error('发布失败');
                    }

                    alert('文章发布成功！');
                    clearForm();
                    loadAdminPosts();
                } catch (error) {
                    console.error('发布失败:', error);
                    alert('发布失败，请重试');
                }
            });
        }

        // 绑定保存草稿按钮事件
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', async () => {
                const title = document.getElementById('title').value;
                const content = editor.getValue();
                const author = document.getElementById('author').value || '匿名';
                
                if (!title || !content) {
                    alert('标题和内容不能为空！');
                    return;
                }

                try {
                    const response = await fetch('/api/posts/drafts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ title, content, author })
                    });

                    if (!response.ok) {
                        throw new Error('保存失败');
                    }

                    alert('草稿保存成功！');
                    clearForm();
                    loadDrafts();
                } catch (error) {
                    console.error('保存失败:', error);
                    alert('保存失败，请重试');
                }
            });
        }
    }

    // 将编辑器实例绑定到全局
    window.editor = editor;

    // 将函数绑定到全局作用域
    window.saveDraft = saveDraft;
    window.publishPost = publishPost;
    window.editPost = editPost;
    window.deletePost = deletePost;
    window.loadAdminPosts = loadAdminPosts;
    window.renderAdminPosts = renderAdminPosts;
    window.showFullPost = showFullPost;
    window.editDraft = editDraft;
    window.deleteDraft = deleteDraft;
    window.publishDraft = publishDraft;

    // 加载初始数据
    loadPosts();
    loadDrafts();

    // 优化版主题切换（移除过渡延迟）
    const themeToggle = document.getElementById('themeToggle');
    let currentTheme = localStorage.getItem('theme') || 'light';

    // 添加滚动监听
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
    
    function updateTheme() {
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        themeToggle.innerHTML = currentTheme === 'dark' 
            ? '<i class="fas fa-sun"></i> 亮色模式'
            : '<i class="fas fa-moon"></i> 暗色模式';
    }
    updateTheme();

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        updateTheme();
    });

    // 添加组合键监听
    let escPressed = false;
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            escPressed = true;
        } else if (escPressed && e.key.toLowerCase() === 'a') {
            showAdminLogin(); // 使用 showAdminLogin 函数
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            escPressed = false;
        }
    });

    // 移动端菜单切换
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.querySelector('.navbar .container').appendChild(menuToggle);

    menuToggle.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('active');
    });

    // 下拉菜单触摸优化
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('active');
        });
    });

    // 新增文章管理功能
    const postsContainer = document.getElementById('posts-container');

    // 加载文章
    async function loadPosts() {
        try {
            const response = await fetch('/api/posts');
            const posts = await response.json();
            renderUserPosts(posts);
        } catch (err) {
            console.error('加载文章失败:', err);
        }
    }

    // 渲染用户视图的文章列表
    function renderUserPosts(posts) {
        const container = document.getElementById('posts-container');
        if (!container) return;

        // 配置 marked 选项
        marked.setOptions({
            gfm: true,
            breaks: true,
            highlight: function(code, language) {
                if (language && Prism.languages[language]) {
                    return Prism.highlight(code, Prism.languages[language], language);
                }
                return code;
            },
            langPrefix: 'language-',
            pedantic: false,
            headerIds: true
        });

        container.innerHTML = posts.map(post => {
            // 处理预览内容
            let previewContent = post.content;
            if (previewContent.length > 300) {
                previewContent = previewContent.substring(0, 300);
            }
            
            // 使用 marked 解析预览内容
            const parsedContent = marked.parse(previewContent);
            
            return `
                <article class="post-card">
                    <div class="post-header">
                        <h2 class="post-title">${post.title}</h2>
                        <div class="post-meta">
                            <span class="post-author">
                                <i class="fas fa-user"></i> ${post.author}
                            </span>
                            <span class="post-date">
                                <i class="far fa-clock"></i> ${new Date(post.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div class="post-content-preview markdown-body">
                        ${parsedContent}
                        ${post.content.length > 300 ? '<div class="content-fade"></div>' : ''}
                    </div>
                    <footer class="post-footer">
                        <div class="post-stats">
                            <span class="post-views" onclick="showFullPost('${post.id}')">
                                <i class="far fa-eye"></i> 阅读全文
                            </span>
                        </div>
                    </footer>
                </article>
            `;
        }).join('');

        // 重新触发 Prism 高亮
        Prism.highlightAllUnder(container);
    }

    // 拖拽上传处理
    const dropZone = document.getElementById('drop-zone');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const formData = new FormData();
            formData.append('file', files[0]);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                editor.setValue(editor.getValue() + `\n![${result.filename}](/uploads/${result.filename})`);
            } catch (err) {
                console.error('上传失败:', err);
            }
        }
    });
});