'use client'

import { useState } from "react"
import { getToolConfig } from "@/lib/tools/config"
import { cn } from "@/lib/utils"
import * as Collapsible from "@radix-ui/react-collapsible"
import { motion, AnimatePresence } from "framer-motion"

interface ToolResultProps {
    toolName: string
    result: unknown
    expanded?: boolean
    header: React.ReactNode
}

export function ToolResult({ toolName, result, expanded: initialExpanded, header }: ToolResultProps) {
    const config = getToolConfig(toolName)
    const [isOpen, setIsOpen] = useState(initialExpanded ?? !config.isCollapsible)

    const content = config.renderResult(result)
    if (!content) return null

    if (!config.isCollapsible) {
        return (
            <>
                {header}
                <div className="mt-2 px-4">{content}</div>
            </>
        )
    }

    return (
        <Collapsible.Root
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <Collapsible.Trigger asChild>
                {header}
            </Collapsible.Trigger>

            <Collapsible.Content forceMount>
                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2 px-4"
                        >
                            {content}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Collapsible.Content>
        </Collapsible.Root>
    )
}