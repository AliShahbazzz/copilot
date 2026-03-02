export interface ui_payload {
  type: "ui_action";
  component: {
    type: string;
    subType: string;
    title: string;
    description: string;
    metadata: string;
    data: {
      summary: string;
      list: any[];
    };
  };
}
