import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const campaignsData = [
  {
    campaign: "Search - Produtos (Máx. CPC)",
    ctr: "7,1%",
    cpcMedio: "R$ 0,58",
    conversoes: "124,7",
    custoConv: "R$ 4,27",
    parcelaDeCusto: "18,26%",
  },
  {
    campaign: "Search - Sauna (Máx. CPC)",
    ctr: "8,36%",
    cpcMedio: "R$ 0,89",
    conversoes: "97,4",
    custoConv: "R$ 6,8",
    parcelaDeCusto: "38,61%",
  },
  {
    campaign: "Search - Branding (Sup. CPC)",
    ctr: "8,83%",
    cpcMedio: "R$ 2,99",
    conversoes: "15,7",
    custoConv: "R$ 34,63",
    parcelaDeCusto: "9,99%",
  },
  {
    campaign: "Search - Serviços (Máx. CPC)",
    ctr: "15,88%",
    cpcMedio: "R$ 0,73",
    conversoes: "14,5",
    custoConv: "R$ 9,28",
    parcelaDeCusto: "39,48%",
  },
]

export default function CampaignsTable() {
  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader>
        <CardTitle className="text-white/90 text-lg">Campanhas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="[&_tr]:border-[#353835]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-[#58E877]/70">Campanha</TableHead>
              <TableHead className="text-[#58E877]/70">CTR</TableHead>
              <TableHead className="text-[#58E877]/70">CPC médio</TableHead>
              <TableHead className="text-[#58E877]/70">Conversões</TableHead>
              <TableHead className="text-[#58E877]/70">Custo/conv.</TableHead>
              <TableHead className="text-[#58E877]/70">Parcela de custo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignsData.map((campaign, index) => (
              <TableRow key={index}>
                <TableCell className="text-white/80">{campaign.campaign}</TableCell>
                <TableCell className="text-white/80">{campaign.ctr}</TableCell>
                <TableCell className="text-white/80">{campaign.cpcMedio}</TableCell>
                <TableCell className="text-white/80">{campaign.conversoes}</TableCell>
                <TableCell className="text-white/80">{campaign.custoConv}</TableCell>
                <TableCell className="text-white/80">{campaign.parcelaDeCusto}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

