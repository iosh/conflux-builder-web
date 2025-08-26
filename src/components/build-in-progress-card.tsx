import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShineBorder } from "@/components/magicui/shine-border";
import { DictionaryType } from "@/get-dictionary";

interface Props {
  dictionary: DictionaryType;
}

export default function BuildInProgressCard({ dictionary }: Props) {
  return (
    <Card className="relative">
      <ShineBorder />
      <CardHeader>
        <CardTitle>{dictionary.page.form.status.inProgress}</CardTitle>
        <CardDescription>
          {dictionary.page.form.status.checking}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-3">
          <Skeleton className="h-[25px] w-[250px] rounded-xl" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </CardContent>
    </Card>
  );
}
