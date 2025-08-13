import type { getDictionary } from "@/get-dictionary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Terminal } from "lucide-react";

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface ProvenanceHelperProps {
  dictionary: Dictionary;
  releaseTagName: string;
}

export default function ProvenanceHelper({
  dictionary,
  releaseTagName,
}: ProvenanceHelperProps) {
  const { title, description, command, learnMore } =
    dictionary.page.provenanceHelper;

  const exampleCommand = command
    .replace("{{BINARY_NAME}}", `conflux-builder-v${releaseTagName}-linux-x86_64.tar.gz`)
    .replace("{{TAG_NAME}}", releaseTagName);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-muted p-4 font-mono text-sm">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>{exampleCommand}</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {learnMore.text}{" "}
          <a
            href={learnMore.linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {learnMore.linkText}
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}