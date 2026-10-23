import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { PedalInviteAccept } from "@/components/pedals/PedalInviteAccept";

interface PedalInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function PedalInvitePage({ params }: PedalInvitePageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-background pb-[calc(var(--footer-space)+2rem)]">
      <Navbar />
      <PedalInviteAccept token={token} />
      <FooterNav />
    </div>
  );
}
