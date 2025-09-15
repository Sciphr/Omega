"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  Plus,
  Search,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuthStore();

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Tournaments", href: "/tournaments" },
    { name: "Teams", href: "/teams" },
    { name: "Players", href: "/players" },
    { name: "Create", href: "/create" },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Omega</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <SearchButton />

            {loading ? (
              // Loading state - show a skeleton or empty space to prevent flickering
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
              </div>
            ) : user ? (
              // Authenticated User Menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user.user_metadata?.display_name?.charAt(0) ||
                          user.user_metadata?.username?.charAt(0) ||
                          user.email?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">
                        {user.user_metadata?.display_name || user.user_metadata?.username || "User"}
                      </p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-tournaments">
                      <Trophy className="mr-2 h-4 w-4" />
                      My Tournaments
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Guest Actions
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navigation.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link href={item.href} className="w-full">
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/create" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tournament
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="font-semibold">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/create"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Create Tournament
                </Link>
              </li>
              <li>
                <Link
                  href="/tournaments"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Browse Tournaments
                </Link>
              </li>
              <li>
                <Link
                  href="/tournaments"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Features
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Account</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign Up
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground">
                  Help Center
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Contact
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Feedback
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground">
                  Privacy
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Terms
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-8 border-t">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Omega</span>
          </div>
          <p className="text-sm text-muted-foreground mt-4 sm:mt-0">
            © 2025 Omega. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function SearchButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to tournaments page with search query
      router.push(`/tournaments?search=${encodeURIComponent(searchQuery.trim())}`)
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Search Tournaments</DialogTitle>
          <DialogDescription>
            Search for tournaments by name, game, or description
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <Input
              placeholder="Enter search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!searchQuery.trim()}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
