<div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Average Engagement Rate (%) <span className="text-destructive">*</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How to calculate: (Likes + Shares + Comments) / Total followers × 100</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-xs text-muted-foreground">Formula: (Likes + Shares + Comments) / Total followers × 100</p>
                  <Input
                    type="number"
                    step="0.1"
                    value={platform.engagementRate || ""}
                    onChange={(e) =>
                      updatePlatform(index, { engagementRate: Number.parseFloat(e.target.value) || undefined })
                    }
                    placeholder="e.g., 3.5"
                    className={`glass ${showErrors && (platform.engagementRate === undefined || platform.engagementRate === null) ? 'border-destructive' : ''}`}
                  />
                  {showErrors && (platform.engagementRate === undefined || platform.engagementRate === null) && (
                    <p className="text-xs text-destructive">Engagement rate is required</p>
                  )}
                </div> */}
