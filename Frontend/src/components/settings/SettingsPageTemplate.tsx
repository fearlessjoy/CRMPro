
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface SettingsPageTemplateProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsPageTemplate = ({
  title,
  description,
  children,
}: SettingsPageTemplateProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          asChild
        >
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to settings</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        {children}
      </div>
    </div>
  );
};
