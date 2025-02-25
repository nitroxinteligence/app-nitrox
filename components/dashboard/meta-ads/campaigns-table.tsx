import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const campaignsData = [
  { dimension: "Anúncio Cyber Monday", impressions: 930, spent: "R$ 220,00" },
  { dimension: "Anúncio apenas para mobile", impressions: 898, spent: "R$ 349,00" },
  { dimension: "Anúncio Black Friday", impressions: 552, spent: "R$ 153,00" },
  { dimension: "Liquidação 35% off", impressions: 542, spent: "R$ 821,00" },
  { dimension: "Meu anúncio de venda de primavera 1", impressions: 415, spent: "R$ 529,00" },
]

export default function CampaignsTable() {
  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader>
        <CardTitle className="text-white/90 text-lg">Visão Geral dos Anúncios</CardTitle>
        <CardDescription className="text-[#E8F3ED]/60">Últimos 30 dias (17 nov - 16 dez)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="[&_tr:hover]:bg-[#040404] [&_tr]:border-[#353835]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-[#58E877]/70">Dimensão</TableHead>
              <TableHead className="text-[#58E877]/70">Impressões</TableHead>
              <TableHead className="text-[#58E877]/70">Gasto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignsData.map((campaign) => (
              <TableRow key={campaign.dimension}>
                <TableCell className="text-white/80">{campaign.dimension}</TableCell>
                <TableCell className="text-white/80">{campaign.impressions}</TableCell>
                <TableCell className="text-white/80">{campaign.spent}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

