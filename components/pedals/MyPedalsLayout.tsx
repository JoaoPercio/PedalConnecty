"use client";

import { useState } from "react";
import Link from "next/link";
import { CompletedPedalRow } from "@/components/pedals/CompletedPedalRow";
import { MyPedalsEmptyState } from "@/components/pedals/MyPedalsEmptyState";
import { MyPedalsSectionHeader } from "@/components/pedals/MyPedalsSectionHeader";
import { PedalSummaryCard } from "@/components/pedals/PedalSummaryCard";
import { SeeAllButton } from "@/components/pedals/SeeAllButton";
import { BikeIcon, LinkIcon } from "@/components/pedals/my-pedals-icons";
import type { PedalSummary } from "@/lib/my-pedals";

const ORGANIZED_PREVIEW = 4;
const PARTICIPATING_PREVIEW = 4;
const COMPLETED_PREVIEW = 3;

interface MyPedalsLayoutProps {
  owned: PedalSummary[];
  participating: PedalSummary[];
  completed: PedalSummary[];
  showInvite: boolean;
}

export function MyPedalsLayout({
  owned,
  participating,
  completed,
  showInvite,
}: MyPedalsLayoutProps) {
  const [showAllOwned, setShowAllOwned] = useState(false);
  const [showAllParticipating, setShowAllParticipating] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const ownedVisible = showAllOwned
    ? owned
    : owned.slice(0, ORGANIZED_PREVIEW);
  const participatingVisible = showAllParticipating
    ? participating
    : participating.slice(0, PARTICIPATING_PREVIEW);
  const completedVisible = showAllCompleted
    ? completed
    : completed.slice(0, COMPLETED_PREVIEW);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <BikeIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Meus pedais
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Seus pedais e experiências com a comunidade.
            </p>
          </div>
        </div>
        {showInvite ? (
          <Link
            href="/pedals/entrar"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-primary bg-surface px-3.5 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5"
          >
            <LinkIcon className="h-4 w-4" />
            Código de convite
          </Link>
        ) : null}
      </header>

      <section className="space-y-3">
        <MyPedalsSectionHeader
          title="Organizo"
          count={owned.length}
          tone="green"
        />
        {owned.length === 0 ? (
          <MyPedalsEmptyState
            tone="green"
            title="Você ainda não criou nenhum pedal."
            description="Crie um pedal e convide a comunidade para pedalar com você."
            actionHref="/pedals/create"
            actionLabel="Criar pedal"
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {ownedVisible.map((p) => (
                <li key={p.id}>
                  <PedalSummaryCard pedal={p} showOrganizerMenu />
                </li>
              ))}
            </ul>
            {owned.length > ORGANIZED_PREVIEW ? (
              <div className="pt-1">
                <SeeAllButton
                  expanded={showAllOwned}
                  onClick={() => setShowAllOwned((v) => !v)}
                  expandLabel="Ver todos os que organizo"
                />
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-3">
        <MyPedalsSectionHeader
          title="Participo"
          count={participating.length}
          tone="blue"
        />
        {participating.length === 0 ? (
          <MyPedalsEmptyState
            tone="blue"
            title="Você ainda não participa de outros pedais."
            description="Explore pedais na sua região e participe de novas experiências."
            actionHref="/home"
            actionLabel="Explorar pedais"
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {participatingVisible.map((p) => (
                <li key={p.id}>
                  <PedalSummaryCard pedal={p} />
                </li>
              ))}
            </ul>
            {participating.length > PARTICIPATING_PREVIEW ? (
              <div className="pt-1">
                <SeeAllButton
                  expanded={showAllParticipating}
                  onClick={() => setShowAllParticipating((v) => !v)}
                  expandLabel="Ver todos os que participo"
                />
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-3">
        <MyPedalsSectionHeader
          title="Pedais realizados"
          count={completed.length}
          tone="gray"
        />
        {completed.length === 0 ? (
          <MyPedalsEmptyState
            title="Ainda não há pedais concluídos na sua conta."
            description="Quando um pedal for finalizado, ele aparece aqui."
          />
        ) : (
          <>
            <ul className="space-y-2.5">
              {completedVisible.map((p) => (
                <li key={p.id}>
                  <CompletedPedalRow pedal={p} />
                </li>
              ))}
            </ul>
            {completed.length > COMPLETED_PREVIEW ? (
              <div className="pt-1">
                <SeeAllButton
                  expanded={showAllCompleted}
                  onClick={() => setShowAllCompleted((v) => !v)}
                  expandLabel="Ver todos os realizados"
                />
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
