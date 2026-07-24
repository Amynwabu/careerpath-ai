import type { TaxonomySourceAdapter } from "./base-adapter";
import { EscoAdapter } from "./esco/adapter";
import { OnetAdapter } from "./onet/adapter";
import { ProfessionalBodiesAdapter } from "./professional-bodies/adapter";
import { UkSocAdapter } from "./uk-soc/adapter";
import type { TaxonomySourceId } from "../types";

export function getAdapter(sourceId: TaxonomySourceId): TaxonomySourceAdapter {
  switch (sourceId) {
    case "uk-soc":
      return new UkSocAdapter();
    case "esco":
      return new EscoAdapter();
    case "onet":
      return new OnetAdapter();
    case "professional-bodies":
      return new ProfessionalBodiesAdapter();
  }
}
