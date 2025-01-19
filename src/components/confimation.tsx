import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const Confirmation = ({
  message,
  result,
  addResultUtility,
}: {
  message: string;
  result: string | undefined;
  addResultUtility: (result: string) => void;
}) => {
  return (
    <Card className="flex flex-col gap-3 bg-card p-6">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      <div className="flex justify-end space-x-2">
        {result === 'deny' && (
          <Button variant="destructive" size="sm" disabled>
            Denied
          </Button>
        )}
        {result === 'confirm' && (
          <Button variant="secondary" size="sm" disabled>
            Confirmed
          </Button>
        )}
        {!result && addResultUtility && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              console.log('deny');
              addResultUtility('deny');
            }}
          >
            Deny
          </Button>
        )}
        {!result && addResultUtility && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              addResultUtility('confirm');
            }}
          >
            Confirm
          </Button>
        )}
      </div>
    </Card>
  );
};
