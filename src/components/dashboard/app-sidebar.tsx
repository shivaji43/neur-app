'use client'

import { Bot, HomeIcon, Workflow } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@/components/ui/sidebar"
import { AppSidebarConversations } from "./app-sidebar-conversations"
import { AppSidebarUser } from "./app-sidebar-user"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { RiHomeOfficeLine } from "@remixicon/react"

const AppSidebarHeader = () => {
    return (
        <SidebarHeader>
            <div className="flex items-center justify-between px-1">
                <span className="font-medium text-lg tracking-tight pl-2 group-data-[collapsible=icon]:hidden">neur.sh</span>
                <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:hidden">
                    <span className="text-xs text-primary-foreground bg-primary/90 rounded-md px-1.5 py-0.5 select-none">
                        BETA
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 select-none">
                        0.1.3
                    </span>
                </div>
            </div>
        </SidebarHeader>
    )
}

const AppSidebarFooter = () => {
    return (
        <SidebarFooter>
            <AppSidebarUser />
        </SidebarFooter>
    )
}

const ExploreItems = [
    {
        title: "Home",
        url: "/home",
        segment: "home",
        icon: HomeIcon,
    },
    {
        title: "Agents",
        url: "/agents",
        segment: "agents",
        icon: Bot,
    },
    {
        title: "Automations",
        url: "/automations",
        segment: "automations",
        icon: Workflow,
    }
] as const

export function AppSidebar() {
    const segment = useSelectedLayoutSegment()

    return (
        <Sidebar variant="sidebar" collapsible="icon">
            <AppSidebarHeader />

            <SidebarContent>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Explore</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {ExploreItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={segment === item.segment}
                                        >
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <AppSidebarConversations />
                </SidebarContent>
            </SidebarContent>

            <AppSidebarFooter />
        </Sidebar>
    )
}