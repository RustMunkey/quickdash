"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Button } from "@/components/ui/button"

interface RichTextEditorProps {
	content: string
	onChange: (html: string) => void
	placeholder?: string
	editable?: boolean
}

function ToolbarButton({
	active,
	onClick,
	children,
}: {
	active?: boolean
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`px-2 py-1 text-xs rounded hover:bg-muted ${
				active ? "bg-muted font-semibold" : ""
			}`}
		>
			{children}
		</button>
	)
}

export function RichTextEditor({ content, onChange, placeholder = "Write something...", editable = true }: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Placeholder.configure({ placeholder }),
		],
		content,
		editable,
		immediatelyRender: false,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML())
		},
		editorProps: {
			attributes: {
				class: "prose prose-sm max-w-none focus:outline-none min-h-[80px] h-full px-3 py-2 text-sm break-words overflow-x-hidden",
			},
		},
	})

	if (!editor) return null

	return (
		<div className="rounded-lg border overflow-hidden flex flex-col h-full min-w-0">
			{editable && (
				<div className="flex items-center gap-0.5 border-b px-2 py-1.5 bg-muted/30 shrink-0">
					<ToolbarButton
						active={editor.isActive("bold")}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						B
					</ToolbarButton>
					<ToolbarButton
						active={editor.isActive("italic")}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					>
						I
					</ToolbarButton>
					<div className="w-px h-4 bg-border mx-1" />
					<ToolbarButton
						active={editor.isActive("bulletList")}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
					>
						List
					</ToolbarButton>
					<ToolbarButton
						active={editor.isActive("orderedList")}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
					>
						1.
					</ToolbarButton>
					<div className="w-px h-4 bg-border mx-1" />
					<ToolbarButton
						active={editor.isActive("heading", { level: 3 })}
						onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
					>
						H
					</ToolbarButton>
					<ToolbarButton
						active={editor.isActive("blockquote")}
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
					>
						&ldquo;
					</ToolbarButton>
				</div>
			)}
			<div className="flex-1">
				<EditorContent editor={editor} className="h-full [&>.tiptap]:h-full" />
			</div>
		</div>
	)
}

export function RichTextDisplay({ content }: { content: string }) {
	const editor = useEditor({
		extensions: [StarterKit],
		content,
		editable: false,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: "prose prose-sm max-w-none text-sm",
			},
		},
	})

	if (!editor) return null
	return <EditorContent editor={editor} />
}
