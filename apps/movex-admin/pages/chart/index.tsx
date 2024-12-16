import React from "react";
import Chart from "../../components/Charts/page";
import DefaultLayout from "../../components/Layouts/DefaultLayout";
// import { Metadata } from "next";

// export const metadata: Metadata = {
//   title: "Next.js Chart | TailAdmin - Next.js Dashboard Template",
//   description:
//     "This is Next.js Chart page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
// };

const BasicChartPage: React.FC = () => {
  return (
    <DefaultLayout>
      <Chart />
    </DefaultLayout>
  );
};

export default BasicChartPage;
