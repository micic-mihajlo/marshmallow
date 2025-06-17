"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Check, Copy } from "lucide-react"
import { useState } from "react"

interface CodeBlockProps {
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

function CodeBlock({ inline, className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || "")
  const language = match ? match[1] : ""
  
  const raw = String(children)
  const trimmed = raw.replace(/\n$/, "")

  // If it's not inline, has no language, and is a single short token (no spaces, one line),
  // render as inline code for a cleaner look.
  const singleLine = trimmed.split("\n").length === 1
  const isSingleToken = !trimmed.includes(" ") && !trimmed.includes("\t")
  if (!inline && !language && singleLine && isSingleToken && trimmed.length <= 30) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[13px] font-mono">
        {trimmed}
      </code>
    )
  }
  
  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[13px] font-mono">
        {children}
      </code>
    )
  }

  const handleCopy = async () => {
    const text = trimmed
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden bg-[#1e293b] border border-gray-700">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers={false}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
        codeTagProps={{
          style: {
            fontSize: "inherit",
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace',
          }
        }}
      >
        {trimmed}
      </SyntaxHighlighter>
    </div>
  )
}

// helper function to detect if content is purely inline (single element, no complex structure)
const isPureInlineContent = (content: string): boolean => {
  const trimmed = content.trim()
  
  // check for single inline code
  const singleCodeMatch = trimmed.match(/^`([^`]+)`$/)
  if (singleCodeMatch) return true
  
  // check for single emphasis
  const singleEmphasisMatch = trimmed.match(/^(\*|_)([^*_]+)\1$/)
  if (singleEmphasisMatch) return true
  
  // check for single strong emphasis
  const singleStrongMatch = trimmed.match(/^(\*\*|__)([^*_]+)\1$/)
  if (singleStrongMatch) return true
  
  // check for very short plain text (likely a single word/variable)
  if (trimmed.length <= 20 && !trimmed.includes(' ') && !trimmed.includes('\n')) {
    return true
  }
  
  return false
}

// helper function to detect if content has minimal markdown (just simple inline elements)
const isMinimalMarkdown = (content: string): boolean => {
  const trimmed = content.trim()
  
  // no block elements (headers, lists, code blocks, etc.)
  if (trimmed.includes('\n\n') || trimmed.includes('# ') || trimmed.includes('- ') || 
      trimmed.includes('* ') || trimmed.includes('```') || trimmed.includes('> ')) {
    return false
  }
  
  // count markdown elements
  const markdownElements = (trimmed.match(/`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|__[^_]+__/g) || []).length
  
  // if it's just one or two simple inline elements, treat as minimal
  return markdownElements <= 2
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: any = {
  code: CodeBlock,
  p: ({ children }: { children: React.ReactNode }) => {
    // unwrap paragraphs that contain only one inline element to avoid full-line block look
    if (Array.isArray(children) && children.length === 1) {
      const child = children[0] as React.ReactElement
      if (child && ["code", "em", "strong"].includes((child.type as any)?.name || (child.type as any))) {
        return <span className="text-[15px] text-gray-700">{child}</span>
      }
    }
    return <p className="mb-4 text-[15px] leading-[1.6] text-gray-700">{children}</p>
  },
  h1: ({ children }: { children: React.ReactNode }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-900">{children}</h1>,
  h2: ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-900">{children}</h2>,
  h3: ({ children }: { children: React.ReactNode }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-900">{children}</h3>,
  ul: ({ children }: { children: React.ReactNode }) => <ul className="mb-4 ml-5 list-disc space-y-2 text-[15px]">{children}</ul>,
  ol: ({ children }: { children: React.ReactNode }) => <ol className="mb-4 ml-5 list-decimal space-y-2 text-[15px]">{children}</ol>,
  li: ({ children }: { children: React.ReactNode }) => <li className="text-gray-700 leading-[1.6]">{children}</li>,
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-orange-400 pl-4 my-4 italic text-gray-600">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" 
       className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
      {children}
    </a>
  ),
}

// minimal components for pure inline content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const minimalComponents: any = {
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-[14px] font-mono">
      {children}
    </code>
  ),
  p: ({ children }: { children: React.ReactNode }) => <span className="text-[15px] text-gray-700">{children}</span>,
  em: ({ children }: { children: React.ReactNode }) => <em className="text-gray-700">{children}</em>,
  strong: ({ children }: { children: React.ReactNode }) => <strong className="font-medium text-gray-800">{children}</strong>,
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" 
       className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
      {children}
    </a>
  ),
}

export const MemoizedMarkdown = memo(
  ({ content }: { content: string; id: string }) => {
    const isPureInline = isPureInlineContent(content)
    const isMinimal = isMinimalMarkdown(content)
    
    // for pure inline content, render with minimal styling
    if (isPureInline) {
      return (
        <div className="inline">
          <ReactMarkdown
            components={minimalComponents}
            remarkPlugins={[remarkGfm]}
          >
            {content}
          </ReactMarkdown>
        </div>
      )
    }
    
    // for minimal markdown, use reduced spacing
    if (isMinimal) {
      return (
        <div className="prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
          <ReactMarkdown
            components={{
              ...components,
              p: ({ children }: { children: React.ReactNode }) => <p className="mb-2 text-[15px] leading-[1.6] text-gray-700">{children}</p>,
            }}
            remarkPlugins={[remarkGfm]}
          >
            {content}
          </ReactMarkdown>
        </div>
      )
    }
    
    // for full markdown content, use full styling
    return (
      <div className="prose-sm max-w-none">
        <ReactMarkdown
          components={components}
          remarkPlugins={[remarkGfm]}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
)

MemoizedMarkdown.displayName = "MemoizedMarkdown" 