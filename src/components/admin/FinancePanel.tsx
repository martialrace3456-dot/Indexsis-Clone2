import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FundingPanel } from "./FundingPanel";
import { BiddingPanel } from "./BiddingPanel";
import { Card, CardContent } from "@/components/ui/card";

export function FinancePanel() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="load">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="load">Funding</TabsTrigger>
            <TabsTrigger value="bidding">Bidding</TabsTrigger>
          </TabsList>
          <TabsContent value="load" className="mt-4">
            <FundingPanel />
          </TabsContent>
          <TabsContent value="bidding" className="mt-4">
            <BiddingPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}