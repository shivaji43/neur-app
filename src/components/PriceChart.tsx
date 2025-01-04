"use client"

import React from 'react'
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface PriceChartProps {
  data: {
    time: string;
    value: number;
  }[];
}

export default function PriceChart({ data }: PriceChartProps) {
  // Transform data to match chart requirements
  const transformedData = data.map(point => ({
    date: point.time,
    price: point.value
  }));

  return (
    <Card className="w-auto h-96 min-w-[600px] min-h-[400px] p-4 bg-gray-900">
      <CardHeader>
        <CardTitle>Price Chart</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer
          config={{
            price: {
              label: "Price",
              color: "hsl(var(--chart-1))",
            },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={transformedData}
              margin={{
                top: 20,
                right: 30,
                left: 60,
                bottom: 60
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{
                  fontSize: 12,
                fill: '#fff'
                }}
                stroke="#666"
                label={{
                  value: 'Date',
                  position: 'bottom',
                  offset: 45,
                  fill: '#fff'
                }}
              />
              <YAxis
                label={{
                  value: 'Price (USD)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -40,
                  fill: '#fff'
                }}
                tick={{
                  fontSize: 12,
                  fill: '#fff'
                }}
                stroke="#666"
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="rgb(75, 192, 192)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}