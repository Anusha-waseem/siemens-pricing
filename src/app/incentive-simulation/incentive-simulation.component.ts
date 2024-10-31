import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { HttpClient } from '@angular/common/http'; // Import HttpClient for fetching the file
import { Chart } from 'chart.js';
import { switchMap } from 'rxjs/operators';
import { AgChartOptions, AgCharts } from 'ag-charts-community'; // Import AG Charts

import { Injectable } from '@angular/core';
import * as math from 'mathjs'; 

// Create a math instance
@Injectable({
  providedIn: 'root'
})

@Component({
  selector: 'app-incentive-simulation',
  templateUrl: './incentive-simulation.component.html',
  styleUrls: ['./incentive-simulation.component.css']
})
export class IncentiveSimulationComponent implements OnInit {
  dat1: { productPriceGroup: string, meanDiscount: number, stdevDiscount: number }[] = [];
  dataFromExcel: any[] = [];
  data: any[] = [];
  weightedMean: number = 0;
  weightedStdDev: number = 0;
  probability:number=0;
  meanEUR: number=0; // Public if you want to access it outside the class
  stdevEUR: number=0; // Public if you want to access it outside the class
  dat: { productPriceGroup: string, meanDiscount: number, stdevDiscount: number }[] = [];
  euroValueFromProbability:number=0

  // Arrays to store values fetched from Excel
  smartPricingValues: number[] = [];
  listPrices: number[] = [];
  quantities: number[] = [];
  incentiveForDeal = 'Incentive details would be displayed here.';
  discount: number = 0;

  // Realistic discount scenario (example data)
  realisticDiscountScenario = 'Scenario details would be displayed here.';

  POS: number[] = [];
  offervolume: number=214993
  topQuotePrices: number = 0;
  floorQuotePrices: number = 0;
  targetQuotePrice: number = 0;
  D46: number = 0; 
  targetQuotePriceChartData = [
    { name: 'Value 1', value: 0 },
    { name: 'Value 2', value: 0 },
    { name: 'Value 3', value: this.targetQuotePrice }, // This will be updated to slider value
    { name: 'Value 4', value: 0 },
    { name: 'Value 5', value: 0 }
  ];

  incentiveChartData = [
    { name: 'Value 1', value: 0 },
    { name: 'Value 2', value: 0 },
    { name: 'Value 3', value: this.probability }, // This will be updated to slider value
    { name: 'Value 4', value: 0 },
    { name: 'Value 5', value: 0 }
  ];


  // Array to store incentive messages for each row
  private chart: Chart | undefined;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Automatically load Excel data from the assets folder
    this.loadExcelData();
    
  }

  loadExcelData() {
    const excelFile1 = 'assets/smartpricing.xlsx';
    const excelFile2 = 'assets/pricegroup.xlsx';

    // Fetch and process the first Excel file
    this.http.get(excelFile1, { responseType: 'arraybuffer' })
      .pipe(
        switchMap(data1 => {
          const workbook1 = XLSX.read(data1, { type: 'array' });
          const firstSheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
          const excelData1 = XLSX.utils.sheet_to_json(firstSheet1, { header: 1 });

          // Process data from the first file
          this.extractDataFromExcel1(excelData1);

          // Fetch the second Excel file after the first is processed
          return this.http.get(excelFile2, { responseType: 'arraybuffer' });
        })
      )
      .subscribe(data2 => {
        const workbook2 = XLSX.read(data2, { type: 'array' });
        const firstSheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
        const excelData2 = XLSX.utils.sheet_to_json(firstSheet2, { header: 1 });

        // Process data from the second file
        this.extractDataFromExcel2(excelData2);
      }, error => {
        console.error('Error loading Excel files:', error);
      });
  }

  extractDataFromExcel1(excelData: any[]) {
    // Clear existing data
    this.smartPricingValues = [];
    this.listPrices = [];
    this.quantities = [];
    this.POS = [];

    // Iterate over each row and extract the data (assuming data starts from row 12)
    for (let i = 9; i < excelData.length; i++) {  // Starting from row 12 (index 9)
      const row = excelData[i];

      // Ensure we have the required values in the row (check column indices)
      if (row.length >= 29) { // 29 because AB is column index 27
        const smartPricing = this.customRound(row[27]); 
        const smartPricingValue = smartPricing; // AB column
        const listPrice = row[26]; // AA column
        const quantity = row[8]; // I column

        if (smartPricingValue > 0 && listPrice > 0 && quantity > 0) {
          this.smartPricingValues.push(smartPricingValue);
          this.listPrices.push(listPrice);
          this.quantities.push(quantity);

          this.calculatePOS(smartPricingValue, listPrice, quantity, i - 9); 
        } else {
          console.log(`Skipping row ${i} due to invalid data:`, row);
        }
      } else {
        console.log(`Skipping row ${i} due to insufficient columns:`, row);
      }
    }
    this.calculateTarget(this.POS);

  }


  

    





  // Method to calculate D46 based on simulatedDiscount
  calculateD46(): number {
    return this.discount; // Use slider value directly
  }

  public calculateDiscountSimulation(): number {
    const D46 = this.calculateD46(); // Update D46
    const discountSimulation = (-(D46 / 1000) + (this.floorQuotePrices / 100) + 0.1) * 100;
    const probability = this.calculateProbability(this.meanEUR, discountSimulation);
    return discountSimulation;

    
    
  }

  
  customRound(value: number): number {
    if (value >= 6 && value <= 10) {
      return Math.ceil(value); // Round up for values between 6 and 10
    } else if (value >= 1 && value < 6) {
      return Math.floor(value); // Round down for values between 1 and 5
    }
    return value; // Return the value unchanged if it's outside the specified ranges
  }

  calculatePOS(smartPricingValue: number, listPrice: number, quantity: number, index: number) {
    const discountFactor = (1 - (smartPricingValue / 100));
    const calculatedPOS = discountFactor * listPrice * quantity; // Calculate the POS value
    let POS: number;

    // Logic to determine rounding
    if (calculatedPOS % 1 >= 0.5) {
      POS = Math.ceil(calculatedPOS); // Round up if the decimal part is 0.5 or higher
    } else {
      POS = Math.floor(calculatedPOS); // Round down otherwise
    }

    this.POS[index] = POS; // Store the rounded POS
    console.log(POS); // Log the final POS value
  }

  private sum(values: number[]): number {
    let total = 0;
    for (const value of values) {
      if (typeof value === 'number' && !isNaN(value)) {
        total += value; // Only add valid numbers
      }
    }
    return total;
  }

  calculateTarget(pos: number[]) {
    console.log('POS values before summation:', this.POS);
    const totalPos = this.sum(pos); // Use the custom sum function
    this.targetQuotePrice = totalPos; // Set the target quote price
    this.floorQuotePrices = this.targetQuotePrice * 0.94; // Calculate floor quote price
    this.topQuotePrices = this.targetQuotePrice * 1.06; // Calculate top quote price

    console.log(`Total POS: ${totalPos}`);
    console.log(`Target Quote Price: ${this.targetQuotePrice}`);
    console.log(`Floor Quote Price: ${this.floorQuotePrices}`);
    console.log(`Top Quote Price: ${this.topQuotePrices}`);
    this.updateTargetQuotePriceChartData(this.targetQuotePrice);
  }

 
 
 


  extractDataFromExcel2(excelData: any[]) {
    excelData.forEach((row, index) => {
      console.log(`Row ${index} data:`, row);
      const hasEmptyCell = row.some((cell: any) => cell === undefined || cell === '');
      if (hasEmptyCell) {
        console.warn(`Row ${index} has an empty cell, skipping.`);
        return;
      }
      if (row.length >= 3) {
        const formattedRow = {
          productPriceGroup: row[0],
          meanDiscount: Number(row[1]),
          stdevDiscount: Number(row[2]),
        };
        console.log(`Formatted Row ${index}:`, formattedRow);

        if (isNaN(formattedRow.meanDiscount) || isNaN(formattedRow.stdevDiscount)) {
          console.warn(`Row ${index} has invalid discount values, skipping:`, formattedRow);
          return;
        }
        this.data.push(formattedRow);
      } else {
        console.warn(`Row ${index} has insufficient columns:`, row);
      }
    });

    // Calculate weighted stats for each price group
    const groupedStats = this.calculateWeightedStatsForGroups();
    
    // Convert to Euro values
    const euroStats = this.convertToEuro(groupedStats); 
    
    // Logging the weighted stats in Euro for each group
    this.logEuroValues(euroStats);


    
    // Set the mean and standard deviation for probability calculation
  
}

private calculateWeightedStatsForGroups() {
    const groups = this.data.reduce((acc: { [key: string]: any[] }, item) => {
        if (!acc[item.productPriceGroup]) {
            acc[item.productPriceGroup] = [];
        }
        acc[item.productPriceGroup].push(item);
        return acc;
    }, {});

    const result = Object.keys(groups).map(group => {
        const items = groups[group];
        console.log(`Processing group: ${group}`, items);

        const totalMeanDiscount = items.reduce((sum: number, item: { meanDiscount: number }) => sum + item.meanDiscount, 0);
        console.log(`Total mean discount for group ${group}:`, totalMeanDiscount);

        const weights = items.map(item => item.meanDiscount / totalMeanDiscount);
        console.log(`Weights for group ${group}:`, weights);

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);
        console.log(`Normalized Weights for group ${group}:`, normalizedWeights);

        const weightedMean = normalizedWeights.reduce((sum: number, weight: number, index: number) => {
            return sum + (weight * items[index].meanDiscount);
        }, 0);
        console.log(`Weighted Mean for group ${group}:`, weightedMean);

        const weightedVariance = normalizedWeights.reduce((sum: number, weight: number, index: number) => {
            const variance = Math.pow(items[index].stdevDiscount, 2);
            return sum + (weight * (variance + Math.pow(items[index].meanDiscount, 2)));
        }, 0) - Math.pow(weightedMean, 2);
        console.log(`Weighted Variance for group ${group}:`, weightedVariance);

        const weightedStdDev = Math.sqrt(weightedVariance);
        console.log(`Weighted StdDev for group ${group}:`, weightedStdDev);

        return {
            productPriceGroup: group,
            weightedMean,
            weightedStdDev,
        };
    });

    return result;
}

private convertToEuro(stats: { 
  productPriceGroup: string; 
  weightedMean: number; 
  weightedStdDev: number; 
}[]) {
    const listPriceGroup = 20; 
    const quantity = 50; 

    let totalWeightedMeanEUR = 0;
    let totalWeightedStdDevEUR = 0;
    let numberOfGroups = stats.length;

    // Create an array to store the processed stats
    const processedStats = stats.map(stat => {
        console.log(`Converting to Euro for group ${stat.productPriceGroup}:`, stat);

        const adjustedMean = (1 - stat.weightedMean); 
        console.log(`Adjusted Mean for group ${stat.productPriceGroup}:`, adjustedMean);

        const weightedMeanEUR = adjustedMean * listPriceGroup * quantity; 
        console.log(`Weighted Mean in EUR for group ${stat.productPriceGroup}:`, weightedMeanEUR);

        const weightedStdDevEUR = stat.weightedStdDev * listPriceGroup * quantity;
        console.log(`Weighted StdDev in EUR for group ${stat.productPriceGroup}:`, weightedStdDevEUR);

        // Accumulate the totals
        totalWeightedMeanEUR += weightedMeanEUR;
        totalWeightedStdDevEUR += weightedStdDevEUR;

        // Return the calculated values without re-calculating
        return {
            productPriceGroup: stat.productPriceGroup,
            weightedMeanEUR: weightedMeanEUR,
            weightedStdDevEUR: weightedStdDevEUR
        };
    });

    // Calculate the overall mean and standard deviation
    this.meanEUR = totalWeightedMeanEUR
    this.stdevEUR = totalWeightedStdDevEUR

    // Log the overall mean and std dev
    console.log(`Overall Mean (EUR): ${this.meanEUR}`);
    console.log(`Overall Std Dev (EUR): ${this.stdevEUR}`);

    // Return the processed stats
    return processedStats;
}


private logEuroValues(euroStats: { productPriceGroup: string; weightedMeanEUR: number; weightedStdDevEUR: number }[]) {
    console.log("Weighted Stats in Euro:");
    euroStats.forEach(group => {
        console.log(`Product Price Group: ${group.productPriceGroup}, Weighted Mean (EUR): ${group.weightedMeanEUR}, Weighted StdDev (EUR): ${group.weightedStdDevEUR}`);
    });
}



// Inverse Error Function (erfinv) Implementation
private erfinv(x: number): number {
  // Coefficients for the approximation
  const a = 0.147; // Approximation constant

  // Calculation
  const the_sign_of_x = (x >= 0) ? 1 : -1;
  const log1minusxsquared = Math.log(1 - x * x);
  const part1 = 2 / (Math.PI * a) + log1minusxsquared / 2;
  const part2 = 1 / a * log1minusxsquared;
  const result = Math.sqrt(Math.sqrt(part1 * part1 - part2) - part1);

  return the_sign_of_x * result;
}

// Updated calculateProbability function
private calculateProbability(eurValue: number, discountSimulation: number): number {
  const mean = this.meanEUR; // Use the mean EUR value
  const stdDev = this.stdevEUR; // Use the standard deviation for EUR

  // Log the values for debugging
  console.log(`Mean: ${mean}, Std Dev: ${stdDev}, Discount Simulation: ${discountSimulation}`);

  // Check if stdDev is zero or negative
  if (stdDev <= 0) {
      console.error("Standard deviation must be greater than zero.");
      return 0; // Handle accordingly, possibly return a default value
  }

  // Calculate z-score for discountSimulation
  const z = (discountSimulation - mean) / stdDev;

  // Calculate the cumulative probability using Math.js error function (erf) for normal distribution
  const cumulativeProbability = 0.5 * (1 + math.erf(z / Math.sqrt(2)));

  // Since you want the probability of values >= discountSimulation, use:
  const probability = 1 - cumulativeProbability;

  // Log the calculated probability
  console.log(`Probability of reaching or exceeding ${discountSimulation} EUR: ${probability}`);

  // Find the Euro value corresponding to the given probability
  const zScoreForProbability = this.erfinv(2 * probability - 1) * Math.sqrt(2); // Calculate the Z-score for the probability
  this.euroValueFromProbability = zScoreForProbability * stdDev + mean; // Calculate the Euro value

  // Log the Euro value
  console.log(`Euro value corresponding to probability ${probability}: ${this.euroValueFromProbability}`);
  

  return this.probability = probability* 100; // Return the probability
  
}






onSliderChange(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  const newValue = Number(value); // Convert the slider value to a number
  console.log(newValue);
  this.updateChartData(this.probability);

  // Check if the newValue is valid and within 0-100 range
  
}



updateChartData(dataValue: number) {
  // Ensure values are valid numbers
  this.incentiveChartData = [
    { name: 'Value 1', value: 0 },
    { name: 'Value 2', value: 0},
    { name: 'Realistic Discount', value: Math.round(dataValue) }, // Round the slider value to avoid decimals
    { name: 'Value 4', value: 0 },
    { name: 'Value 5', value: 0 }
  ];
}



yTicks = [0, 10,20,30, 40,50, 60,70, 80,90, 100]; // Define custom Y-axis ticks
yTicksTargetQuotePrice = [0, 50000, 100000,150000,200000];

formatYAxisTick(value: number): string {
  return `${value}`; // Format the tick labels to append '%'
}








updateTargetQuotePriceChartData(dataValue: number) {
  console.log("Received dataValue in updateTargetQuotePriceChartData:", dataValue); // Log the received value

  // Ensure values are valid numbers
  this.targetQuotePriceChartData = [
    { name: 'Value 1', value: 0 },
    { name: 'Value 2', value: 0 },
    { name: 'Incentive', value: Math.round(dataValue) },
    { name: 'Value 4', value: 0 },
    { name: 'Value 5', value: 0 }
  ];

  console.log("Updated Target Quote Price Chart Data:", this.targetQuotePriceChartData); // Log updated chart data
}


}
