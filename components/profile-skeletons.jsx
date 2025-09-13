import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function ProfileHeaderSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-full" /> {/* Avatar */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" /> {/* Display name */}
            <Skeleton className="h-4 w-64" /> {/* Email */}
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-20" /> {/* Member since */}
              <Skeleton className="h-4 w-16" /> {/* Some other stat */}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

export function TournamentsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Active Tournaments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" /> {/* "Active Tournaments" title */}
            <Skeleton className="h-9 w-32" /> {/* Create button */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" /> {/* Tournament name */}
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-20" /> {/* Game */}
                    <Skeleton className="h-4 w-24" /> {/* Status */}
                    <Skeleton className="h-4 w-32" /> {/* Date */}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" /> {/* View button */}
                  <Skeleton className="h-8 w-20" /> {/* Manage button */}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Past Tournaments Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" /> {/* "Completed Tournaments" title */}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-44" /> {/* Tournament name */}
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-20" /> {/* Game */}
                    <Skeleton className="h-4 w-28" /> {/* Completed status */}
                    <Skeleton className="h-4 w-32" /> {/* Date */}
                  </div>
                </div>
                <Skeleton className="h-8 w-16" /> {/* View button */}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function GamesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" /> {/* "My Games" title */}
          <Skeleton className="h-9 w-28" /> {/* Add Game button */}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-lg" /> {/* Game icon */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" /> {/* Game name */}
                  <Skeleton className="h-4 w-24" /> {/* Display name */}
                  <Skeleton className="h-4 w-20" /> {/* Rank */}
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8" /> {/* Edit button */}
                <Skeleton className="h-8 w-8" /> {/* Delete button */}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TeamsSkeleton() {
  return (
    <div className="space-y-6">
      {/* My Teams Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" /> {/* "My Teams" title */}
            <Skeleton className="h-9 w-28" /> {/* Create Team button */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-lg" /> {/* Team icon */}
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" /> {/* Team name */}
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-16" /> {/* Game */}
                      <Skeleton className="h-4 w-20" /> {/* Members count */}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" /> {/* View button */}
                  <Skeleton className="h-8 w-20" /> {/* Manage button */}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function LinkedAccountsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" /> {/* "Linked Accounts" title */}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-lg" /> {/* Platform icon */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" /> {/* Platform name */}
                  <Skeleton className="h-4 w-32" /> {/* Username */}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-12" /> {/* Toggle switch */}
                <Skeleton className="h-8 w-8" /> {/* Unlink button */}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}