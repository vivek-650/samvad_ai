"use client";

import React from "react";
import { useIntegrations } from "./hooks/useIntegrations";
import SetupForm from "./components/SetupForm";
import IntegrationCard from "./components/IntegrationCard";
import { CircleQuestionMark, Loader2 } from "lucide-react";

function Integrations() {
  const {
    integrations,
    loading,
    setupMode,
    setSetupMode,
    setupData,
    setSetupData,
    setupLoading,
    setSetupLoading,
    fetchIntegrations,
    fetchSetupData,
    handleConnect,
    handleDisconnect,
    handleSetupSubmit,
  } = useIntegrations();

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="animate-spin h-5 w-5 text-foreground " />
          <div className="text-foreground mb-1">Loading Integrations</div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-h-screen ">
      <div className="max-w-4xl ">
        {setupMode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 border border-border max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Setup {setupMode.charAt(0).toUpperCase() + setupMode.slice(1)}
              </h2>

              <SetupForm
                platform={setupMode}
                data={setupData}
                onSubmit={handleSetupSubmit}
                onCancel={() => {
                  setSetupMode(null);
                  setSetupData(null);
                  window.history.replaceState(
                    {},
                    "",
                    "/dashboard/integrations"
                  );
                }}
                loading={setupLoading}
              />
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.platform}
              integration={integration}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSetup={(platform) => {
                setSetupMode(platform);
                fetchSetupData(platform);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Integrations;
