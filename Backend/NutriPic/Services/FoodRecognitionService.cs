namespace NutriPic.Services;

using AlibabaCloud.OpenApiClient.Models;

// Services/FoodRecognitionService.cs
using AlibabaCloud.SDK.Imageseg20191230;
using AlibabaCloud.SDK.Imageseg20191230.Models;
using AlibabaCloud.TeaUtil.Models;

public class FoodRecognitionService
{
    private readonly Client _client;

    public FoodRecognitionService()
    {
        var config = new Config
        {
            AccessKeyId = Environment.GetEnvironmentVariable("ALIBABA_ACCESS_KEY"),
            AccessKeySecret = Environment.GetEnvironmentVariable("ALIBABA_SECRET_KEY"),
            Endpoint = "imageseg.cn-shanghai.aliyuncs.com"
        };
        _client = new Client(config);
    }

    public async Task<RecognizeFoodResponse> RecognizeFood(byte[] imageData)
    {
        var recognizeRequest = new RecognizeFoodRequest
        {
            ImageURL = await UploadImageToOSS(imageData)
        };

        var runtime = new RuntimeOptions();
        return await _client.RecognizeFoodWithOptionsAsync(recognizeRequest, runtime);
    }

    private async Task<string> UploadImageToOSS(byte[] imageData)
    {
        // Implement OSS upload logic
        // Return public URL for the image
        return "https://your-bucket.oss-cn-shanghai.aliyuncs.com/temp-food-image.jpg";
    }
}