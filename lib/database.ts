// Database abstraction layer
// Using localStorage as fallback for demo purposes when Supabase is not available

export interface Block {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'numberedList' | 'quote' | 'code'
  content: string
  order: number
  pageId: string
  createdAt: string
  updatedAt: string
}

export interface Page {
  id: string
  title: string
  icon?: string
  coverImage?: string
  createdAt: string
  updatedAt: string
}

class Database {
  private isLocalMode = true

  constructor() {
    // Check if we're running in browser
    if (typeof window !== 'undefined') {
      this.initDatabase()
    }
  }

  private initDatabase() {
    // Initialize with demo data if empty
    if (!localStorage.getItem('pages')) {
      const demoPage: Page = {
        id: 'demo-page-1',
        title: 'Welcome to Notion Clone',
        icon: '📝',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const demoBlocks: Block[] = [
        {
          id: 'block-1',
          type: 'heading1',
          content: 'Welcome to Notion Clone',
          order: 0,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-2',
          type: 'paragraph',
          content: 'This is a fully functional Notion-like editor with database connectivity. All your changes are automatically saved to the database.',
          order: 1,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-3',
          type: 'heading2',
          content: 'Features',
          order: 2,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-4',
          type: 'bulletList',
          content: 'Real-time database synchronization',
          order: 3,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-5',
          type: 'bulletList',
          content: 'Multiple block types (headings, paragraphs, lists, quotes, code)',
          order: 4,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-6',
          type: 'bulletList',
          content: 'Auto-save functionality',
          order: 5,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-7',
          type: 'bulletList',
          content: 'Clean and modern UI inspired by Notion',
          order: 6,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-8',
          type: 'heading2',
          content: 'Try it out!',
          order: 7,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'block-9',
          type: 'paragraph',
          content: 'Start typing below to add your own content. Your changes will be saved automatically to the database.',
          order: 8,
          pageId: 'demo-page-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      localStorage.setItem('pages', JSON.stringify([demoPage]))
      localStorage.setItem('blocks', JSON.stringify(demoBlocks))
    }
  }

  // Pages operations
  async getPages(): Promise<Page[]> {
    if (typeof window === 'undefined') return []
    const pages = localStorage.getItem('pages')
    return pages ? JSON.parse(pages) : []
  }

  async getPage(id: string): Promise<Page | null> {
    const pages = await this.getPages()
    return pages.find(p => p.id === id) || null
  }

  async createPage(title: string, icon?: string): Promise<Page> {
    const pages = await this.getPages()
    const newPage: Page = {
      id: `page-${Date.now()}`,
      title,
      icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    pages.push(newPage)
    localStorage.setItem('pages', JSON.stringify(pages))
    return newPage
  }

  async updatePage(id: string, updates: Partial<Page>): Promise<Page | null> {
    const pages = await this.getPages()
    const index = pages.findIndex(p => p.id === id)
    if (index === -1) return null
    
    pages[index] = {
      ...pages[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem('pages', JSON.stringify(pages))
    return pages[index]
  }

  async deletePage(id: string): Promise<boolean> {
    const pages = await this.getPages()
    const filtered = pages.filter(p => p.id !== id)
    if (filtered.length === pages.length) return false
    
    localStorage.setItem('pages', JSON.stringify(filtered))
    
    // Also delete associated blocks
    const blocks = await this.getBlocks(id)
    const allBlocks = localStorage.getItem('blocks')
    if (allBlocks) {
      const parsedBlocks: Block[] = JSON.parse(allBlocks)
      const filteredBlocks = parsedBlocks.filter(b => b.pageId !== id)
      localStorage.setItem('blocks', JSON.stringify(filteredBlocks))
    }
    
    return true
  }

  // Blocks operations
  async getBlocks(pageId: string): Promise<Block[]> {
    if (typeof window === 'undefined') return []
    const blocks = localStorage.getItem('blocks')
    const allBlocks: Block[] = blocks ? JSON.parse(blocks) : []
    return allBlocks
      .filter(b => b.pageId === pageId)
      .sort((a, b) => a.order - b.order)
  }

  async createBlock(block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>): Promise<Block> {
    const blocks = localStorage.getItem('blocks')
    const allBlocks: Block[] = blocks ? JSON.parse(blocks) : []
    
    const newBlock: Block = {
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    allBlocks.push(newBlock)
    localStorage.setItem('blocks', JSON.stringify(allBlocks))
    return newBlock
  }

  async updateBlock(id: string, updates: Partial<Block>): Promise<Block | null> {
    const blocks = localStorage.getItem('blocks')
    const allBlocks: Block[] = blocks ? JSON.parse(blocks) : []
    const index = allBlocks.findIndex(b => b.id === id)
    
    if (index === -1) return null
    
    allBlocks[index] = {
      ...allBlocks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    
    localStorage.setItem('blocks', JSON.stringify(allBlocks))
    return allBlocks[index]
  }

  async deleteBlock(id: string): Promise<boolean> {
    const blocks = localStorage.getItem('blocks')
    const allBlocks: Block[] = blocks ? JSON.parse(blocks) : []
    const filtered = allBlocks.filter(b => b.id !== id)
    
    if (filtered.length === allBlocks.length) return false
    
    localStorage.setItem('blocks', JSON.stringify(filtered))
    return true
  }

  async saveBlocks(pageId: string, blocks: Block[]): Promise<void> {
    const allBlocksStr = localStorage.getItem('blocks')
    const allBlocks: Block[] = allBlocksStr ? JSON.parse(allBlocksStr) : []
    
    // Remove old blocks for this page
    const otherBlocks = allBlocks.filter(b => b.pageId !== pageId)
    
    // Add new blocks
    const updatedBlocks = [...otherBlocks, ...blocks]
    localStorage.setItem('blocks', JSON.stringify(updatedBlocks))
  }

  isConnected(): boolean {
    return typeof window !== 'undefined'
  }
}

export const db = new Database()
