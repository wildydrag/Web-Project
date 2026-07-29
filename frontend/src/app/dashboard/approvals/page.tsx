"use client";

import Link from "next/link";
import { UserCheck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/lib/format";
import { useApiResource } from "@/lib/api/hooks";

/** Pending applicants, already joined to the applicant's email by the backend. */
interface PendingApplication {
  id: string;
  name: string;
  email: string;
  requestedAt: string;
  portfolio: string;
}

export default function ApprovalsPage() {
  const { data } = useApiResource<PendingApplication[]>("/dashboard/approvals/");
  const pending = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">احراز هویت هنرمندان</h1>
        <p className="text-sm text-muted-foreground">
          درخواست‌های در انتظار تایید را بررسی کنید.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="درخواستی در انتظار نیست"
          description="همه‌ی درخواست‌های احراز هویت بررسی شده‌اند."
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام هنری</TableHead>
                <TableHead className="hidden sm:table-cell">ایمیل</TableHead>
                <TableHead className="hidden md:table-cell">تاریخ درخواست</TableHead>
                <TableHead className="text-end">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((artist) => {
                return (
                  <TableRow key={artist.id}>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell" dir="ltr">
                      {artist.email}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatShortDate(artist.requestedAt)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/dashboard/approvals/${artist.id}`} />}
                      >
                        مشاهده نمونه‌کارها
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
