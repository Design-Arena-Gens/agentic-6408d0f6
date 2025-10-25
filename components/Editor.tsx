'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { createEditor, Descendant, Editor as SlateEditor, Transforms, Element as SlateElement, BaseEditor } from 'slate'
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps, ReactEditor } from 'slate-react'
import { withHistory, HistoryEditor } from 'slate-history'
import { db, Block, Page } from '@/lib/database'
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Save,
  Menu,
  Plus,
  GripVertical,
  Database
} from 'lucide-react'

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'numberedList' | 'quote' | 'code'

interface CustomElement {
  type: BlockType
  children: CustomText[]
  id?: string
}

interface CustomText {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  code?: boolean
}

type CustomEditor = BaseEditor & ReactEditor & HistoryEditor

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor
    Element: CustomElement
    Text: CustomText
  }
}

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

export default function Editor() {
  const [editor] = useState(() => withHistory(withReact(createEditor())))
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'paragraph',
      children: [{ text: '' }],
    },
  ])
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Load pages and initial content
  useEffect(() => {
    const loadData = async () => {
      const allPages = await db.getPages()
      setPages(allPages)
      setIsConnected(db.isConnected())
      
      if (allPages.length > 0) {
        const page = allPages[0]
        setCurrentPage(page)
        const blocks = await db.getBlocks(page.id)
        
        if (blocks.length > 0) {
          const slateValue: Descendant[] = blocks.map(block => ({
            type: block.type,
            id: block.id,
            children: [{ text: block.content }],
          }))
          setValue(slateValue)
        }
      }
    }
    
    loadData()
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (!currentPage) return

    const saveTimeout = setTimeout(async () => {
      await saveContent()
    }, 1000)

    return () => clearTimeout(saveTimeout)
  }, [value, currentPage])

  const saveContent = async () => {
    if (!currentPage) return
    
    setSaving(true)
    
    try {
      const blocks: Block[] = value.map((node, index) => {
        const element = node as CustomElement
        const text = element.children.map(child => child.text).join('')
        
        return {
          id: element.id || `block-${Date.now()}-${index}`,
          type: element.type,
          content: text,
          order: index,
          pageId: currentPage.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      })
      
      await db.saveBlocks(currentPage.id, blocks)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const renderElement = useCallback((props: RenderElementProps) => {
    const { attributes, children, element } = props
    const customElement = element as CustomElement

    const blockContent = (
      <>
        <div className="block-handle" contentEditable={false}>
          <GripVertical size={16} />
        </div>
        {children}
      </>
    )

    switch (customElement.type) {
      case 'heading1':
        return (
          <div className="block-wrapper" {...attributes}>
            <h1>{blockContent}</h1>
          </div>
        )
      case 'heading2':
        return (
          <div className="block-wrapper" {...attributes}>
            <h2>{blockContent}</h2>
          </div>
        )
      case 'heading3':
        return (
          <div className="block-wrapper" {...attributes}>
            <h3>{blockContent}</h3>
          </div>
        )
      case 'bulletList':
        return (
          <div className="block-wrapper" {...attributes}>
            <ul>
              <li>{blockContent}</li>
            </ul>
          </div>
        )
      case 'numberedList':
        return (
          <div className="block-wrapper" {...attributes}>
            <ol>
              <li>{blockContent}</li>
            </ol>
          </div>
        )
      case 'quote':
        return (
          <div className="block-wrapper" {...attributes}>
            <blockquote>{blockContent}</blockquote>
          </div>
        )
      case 'code':
        return (
          <div className="block-wrapper" {...attributes}>
            <pre>
              <code>{blockContent}</code>
            </pre>
          </div>
        )
      default:
        return (
          <div className="block-wrapper" {...attributes}>
            <p>{blockContent}</p>
          </div>
        )
    }
  }, [])

  const renderLeaf = useCallback((props: RenderLeafProps) => {
    let { attributes, children, leaf } = props
    const customLeaf = leaf as CustomText

    if (customLeaf.bold) {
      children = <strong>{children}</strong>
    }

    if (customLeaf.italic) {
      children = <em>{children}</em>
    }

    if (customLeaf.underline) {
      children = <u>{children}</u>
    }

    if (customLeaf.code) {
      children = <code>{children}</code>
    }

    return <span {...attributes}>{children}</span>
  }, [])

  const toggleBlock = (format: BlockType) => {
    const isActive = isBlockActive(editor, format)
    const newType = isActive ? 'paragraph' : format

    Transforms.setNodes<SlateElement>(
      editor,
      { type: newType } as Partial<SlateElement>,
      { match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && SlateEditor.isBlock(editor, n) }
    )
  }

  const toggleMark = (format: keyof CustomText) => {
    const isActive = isMarkActive(editor, format)

    if (isActive) {
      SlateEditor.removeMark(editor, format)
    } else {
      SlateEditor.addMark(editor, format, true)
    }
  }

  const isBlockActive = (editor: CustomEditor, format: BlockType) => {
    const { selection } = editor
    if (!selection) return false

    const [match] = Array.from(
      SlateEditor.nodes(editor, {
        at: SlateEditor.unhangRange(editor, selection),
        match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && (n as CustomElement).type === format,
      })
    )

    return !!match
  }

  const isMarkActive = (editor: CustomEditor, format: keyof CustomText) => {
    const marks = SlateEditor.marks(editor) as CustomText | null
    return marks ? marks[format] === true : false
  }

  const createNewPage = async () => {
    const newPage = await db.createPage('Untitled', '📄')
    setPages([...pages, newPage])
    setCurrentPage(newPage)
    setValue([
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ])
  }

  const selectPage = async (page: Page) => {
    setCurrentPage(page)
    const blocks = await db.getBlocks(page.id)
    
    if (blocks.length > 0) {
      const slateValue: Descendant[] = blocks.map(block => ({
        type: block.type,
        id: block.id,
        children: [{ text: block.content }],
      }))
      setValue(slateValue)
    } else {
      setValue([
        {
          type: 'paragraph',
          children: [{ text: '' }],
        },
      ])
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-notion-text mb-2 px-2">Pages</h2>
          <button
            onClick={createNewPage}
            className="w-full sidebar-item justify-start"
          >
            <Plus size={16} />
            <span>New Page</span>
          </button>
        </div>
        
        <div className="space-y-1">
          {pages.map(page => (
            <div
              key={page.id}
              onClick={() => selectPage(page)}
              className={`sidebar-item ${currentPage?.id === page.id ? 'active' : ''}`}
            >
              <span>{page.icon || '📄'}</span>
              <span className="truncate">{page.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Toolbar */}
        <div className="toolbar">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="toolbar-button lg:hidden"
          >
            <Menu size={18} />
          </button>

          <button
            onClick={() => toggleMark('bold')}
            className={`toolbar-button ${isMarkActive(editor, 'bold') ? 'active' : ''}`}
          >
            <Bold size={18} />
          </button>

          <button
            onClick={() => toggleMark('italic')}
            className={`toolbar-button ${isMarkActive(editor, 'italic') ? 'active' : ''}`}
          >
            <Italic size={18} />
          </button>

          <button
            onClick={() => toggleMark('underline')}
            className={`toolbar-button ${isMarkActive(editor, 'underline') ? 'active' : ''}`}
          >
            <Underline size={18} />
          </button>

          <div className="w-px h-6 bg-notion-border" />

          <button
            onClick={() => toggleBlock('heading1')}
            className={`toolbar-button ${isBlockActive(editor, 'heading1') ? 'active' : ''}`}
          >
            <Heading1 size={18} />
          </button>

          <button
            onClick={() => toggleBlock('heading2')}
            className={`toolbar-button ${isBlockActive(editor, 'heading2') ? 'active' : ''}`}
          >
            <Heading2 size={18} />
          </button>

          <button
            onClick={() => toggleBlock('heading3')}
            className={`toolbar-button ${isBlockActive(editor, 'heading3') ? 'active' : ''}`}
          >
            <Heading3 size={18} />
          </button>

          <div className="w-px h-6 bg-notion-border" />

          <button
            onClick={() => toggleBlock('bulletList')}
            className={`toolbar-button ${isBlockActive(editor, 'bulletList') ? 'active' : ''}`}
          >
            <List size={18} />
          </button>

          <button
            onClick={() => toggleBlock('numberedList')}
            className={`toolbar-button ${isBlockActive(editor, 'numberedList') ? 'active' : ''}`}
          >
            <ListOrdered size={18} />
          </button>

          <button
            onClick={() => toggleBlock('quote')}
            className={`toolbar-button ${isBlockActive(editor, 'quote') ? 'active' : ''}`}
          >
            <Quote size={18} />
          </button>

          <button
            onClick={() => toggleBlock('code')}
            className={`toolbar-button ${isBlockActive(editor, 'code') ? 'active' : ''}`}
          >
            <Code size={18} />
          </button>

          <div className="flex-1" />

          {saving && (
            <div className="text-sm text-notion-text flex items-center gap-2">
              <Save size={16} className="animate-pulse" />
              Saving...
            </div>
          )}

          {lastSaved && !saving && (
            <div className="text-sm text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="editor-content">
          <Slate editor={editor} initialValue={value} onChange={setValue}>
            <Editable
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              placeholder="Start typing..."
              spellCheck
              autoFocus
              onKeyDown={event => {
                for (const hotkey in HOTKEYS) {
                  if (isHotkey(hotkey, event as any)) {
                    event.preventDefault()
                    const mark = HOTKEYS[hotkey] as keyof CustomText
                    toggleMark(mark)
                  }
                }
              }}
            />
          </Slate>
        </div>
      </div>

      {/* Database Status Indicator */}
      <div className={`db-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        <Database size={16} />
        <span>{isConnected ? 'Database Connected' : 'Database Disconnected'}</span>
      </div>
    </div>
  )
}

// Helper function to check hotkeys
function isHotkey(hotkey: string, event: KeyboardEvent): boolean {
  const keys = hotkey.split('+')
  const modKey = keys.includes('mod')
  const key = keys[keys.length - 1]

  const isMod = event.metaKey || event.ctrlKey
  
  if (modKey && !isMod) return false
  if (event.key.toLowerCase() !== key.toLowerCase()) return false
  
  return true
}
