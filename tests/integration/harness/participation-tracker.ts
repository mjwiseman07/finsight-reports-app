import type { FrameworkId } from "../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";

export class ParticipationTracker {
  private readonly verticals = new Set<string>();
  private readonly frameworks = new Set<FrameworkId>();
  private readonly controlLayers = new Set<string>();
  private readonly channels = new Set<string>();

  recordVertical(vertical: string): void {
    this.verticals.add(vertical);
  }

  recordFramework(framework: FrameworkId): void {
    this.frameworks.add(framework);
  }

  recordControlLayer(layer: string): void {
    this.controlLayers.add(layer);
  }

  recordChannel(channel: string): void {
    this.channels.add(channel);
  }

  verticalsList(): readonly string[] {
    return Object.freeze([...this.verticals].sort());
  }

  frameworksList(): readonly FrameworkId[] {
    return Object.freeze([...this.frameworks].sort()) as FrameworkId[];
  }

  controlLayersList(): readonly string[] {
    return Object.freeze([...this.controlLayers].sort());
  }

  channelsList(): readonly string[] {
    return Object.freeze([...this.channels].sort());
  }
}
